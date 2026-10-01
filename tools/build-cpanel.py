#!/usr/bin/env python3
"""
Build a cPanel-ready zip of the TRM Holidays website.

    python tools/build-cpanel.py trmholidays.com          # https://trmholidays.com
    python tools/build-cpanel.py trmholidays.com --www    # https://www.trmholidays.com

What it does
  * copies only the files the live site needs (no .git, .github, apps_script,
    README, unused photos, build tools)
  * rewrites every SEO URL (canonical, og:url, og:image, JSON-LD, sitemap,
    robots, 404 page) from the GitHub Pages address to your domain
  * writes robots.txt, sitemap.xml and an .htaccess (HTTPS, host redirect,
    gzip, caching, security headers, 404 page)
  * checks the result and writes dist/trm-holidays-cpanel.zip

Upload the zip to public_html in cPanel File Manager and Extract it.
"""
import argparse, datetime, glob, json, os, re, shutil, sys, tempfile, zipfile
import xml.dom.minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_BASE = "https://omaar-x.github.io/TRM-Holidays-website/"      # what the repo files point at
OUT_DIR = os.path.join(ROOT, "dist")
OUT_ZIP = os.path.join(OUT_DIR, "trm-holidays-cpanel.zip")

TEXT_EXT = (".html", ".css", ".js", ".webmanifest", ".xml", ".txt")
# Files the pages reference only through absolute URLs (so the crawl cannot see them)
ALWAYS = {
    "favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png",
    "android-chrome-192x192.png", "android-chrome-512x512.png",
    "mstile-150x150.png", "browserconfig.xml",              # Windows tile (named in <meta>, not href)
    "assets/images/og-cover.jpg", "site.webmanifest", "404.html", "admin.html",
}
REF = re.compile(r'''(?:href|src)=["']([^"'#?]+)|url\(["']?([^)"'#?]+)|['"]((?:assets/|favicon|site\.webmanifest)[^'"?#]+)''')


def referenced_files():
    refs = set()
    sources = glob.glob(os.path.join(ROOT, "*.html")) + \
        glob.glob(os.path.join(ROOT, "assets", "**", "*.css"), recursive=True) + \
        glob.glob(os.path.join(ROOT, "assets", "**", "*.js"), recursive=True) + \
        [os.path.join(ROOT, "site.webmanifest")]
    for fn in sources:
        s = open(fn, encoding="utf-8").read()
        for m in REF.finditer(s):
            u = next(g for g in m.groups() if g)
            if re.match(r"(https?:|//|mailto:|tel:|data:|javascript:)", u):
                continue
            refs.add(os.path.normpath(u).replace("\\", "/"))
    return refs


def htaccess(host, www):
    bare = host[4:] if host.startswith("www.") else host
    canonical = ("www." + bare) if www else bare
    other = bare if www else "www." + bare
    other_re = re.escape(other)
    return f"""# TRM Holidays - Apache settings for cPanel hosting
# NOTE: install the free SSL certificate first (cPanel > SSL/TLS Status > Run AutoSSL),
# then keep this file. It sends every visitor to https://{canonical}

AddDefaultCharset UTF-8
Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html
AddType application/manifest+json .webmanifest

<IfModule mod_rewrite.c>
RewriteEngine On

# 1) Force HTTPS and the main host name in a single redirect
RewriteCond %{{HTTPS}} !=on
RewriteCond %{{HTTP:X-Forwarded-Proto}} !=https
RewriteRule ^ https://{canonical}%{{REQUEST_URI}} [L,R=301]

# 2) {other} -> {canonical}
RewriteCond %{{HTTP_HOST}} ^{other_re}$ [NC]
RewriteRule ^ https://{canonical}%{{REQUEST_URI}} [L,R=301]

# 3) /index.html -> /  (one address for the home page)
RewriteCond %{{THE_REQUEST}} \\s/index\\.html[\\s?] [NC]
RewriteRule ^index\\.html$ / [L,R=301]
</IfModule>

# Compression
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/xml application/javascript text/javascript application/json application/manifest+json image/svg+xml
</IfModule>

# Browser caching
<IfModule mod_expires.c>
ExpiresActive On
ExpiresDefault "access plus 1 day"
ExpiresByType text/html "access plus 10 minutes"
ExpiresByType text/css "access plus 1 week"
ExpiresByType application/javascript "access plus 1 week"
ExpiresByType text/javascript "access plus 1 week"
ExpiresByType image/jpeg "access plus 1 month"
ExpiresByType image/png "access plus 1 month"
ExpiresByType image/x-icon "access plus 1 month"
ExpiresByType image/vnd.microsoft.icon "access plus 1 month"
ExpiresByType application/manifest+json "access plus 1 week"
ExpiresByType application/xml "access plus 1 day"
ExpiresByType text/xml "access plus 1 day"
</IfModule>

# Security headers + keep the admin page out of search engines
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header always set Strict-Transport-Security "max-age=31536000"
<FilesMatch "^admin\\.html$">
Header set X-Robots-Tag "noindex, nofollow, noarchive"
</FilesMatch>
</IfModule>
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("domain", help="e.g. trmholidays.com")
    ap.add_argument("--www", action="store_true", help="use https://www.<domain> as the main address")
    args = ap.parse_args()

    host = re.sub(r"^https?://", "", args.domain.strip().lower()).strip("/")
    bare = host[4:] if host.startswith("www.") else host
    if not re.fullmatch(r"[a-z0-9-]+(\.[a-z0-9-]+)+", bare):
        sys.exit("That does not look like a domain: %r" % args.domain)
    canon_host = ("www." + bare) if args.www else bare
    base = "https://%s/" % canon_host

    refs = referenced_files() | ALWAYS
    stage = tempfile.mkdtemp(prefix="trm-cpanel-")
    kept, skipped = [], []

    # ---- 1. copy only what the site uses --------------------------------------------------
    skip_dirs = {".git", ".github", ".claude", "apps_script", "tools", "dist", "node_modules"}
    skip_files = {"README.md", ".gitignore", "robots.txt", "sitemap.xml", ".htaccess"}   # last three are regenerated
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            if name in skip_files and "/" not in rel:
                continue
            is_page = "/" not in rel and rel.endswith(".html")
            if rel in refs or is_page:
                kept.append(rel)
            else:
                skipped.append(rel)
    for rel in kept:
        dst = os.path.join(stage, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel.endswith(TEXT_EXT):
            s = open(os.path.join(ROOT, rel), encoding="utf-8").read().replace(SRC_BASE, base)
            open(dst, "w", encoding="utf-8", newline="\n").write(s)
        else:
            shutil.copy2(os.path.join(ROOT, rel), dst)

    # ---- 2. sitemap, robots, htaccess -----------------------------------------------------
    today = datetime.date.today().isoformat()
    pages = sorted(f for f in kept if "/" not in f and f.endswith(".html") and f not in ("admin.html", "404.html"))
    order = ["index.html", "tours.html", "flights.html", "hotels.html", "about.html", "contact.html"]
    pages = [p for p in order if p in pages] + [p for p in pages if p not in order and p != "tour-detail.html"]
    urls = [base if p == "index.html" else base + p for p in pages]
    tours_js = open(os.path.join(ROOT, "assets/js/tours-data.js"), encoding="utf-8").read()
    urls += [base + "tour-detail.html?id=" + t for t in re.findall(r"id:\s*'(TR-\d+)'", tours_js)]
    xml_out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml_out += "".join("  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n" % (u.replace("&", "&amp;"), today) for u in urls)
    xml_out += "</urlset>\n"
    open(os.path.join(stage, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write(xml_out)
    open(os.path.join(stage, "robots.txt"), "w", encoding="utf-8", newline="\n").write(
        "User-agent: *\nAllow: /\nDisallow: /admin.html\n\nSitemap: %ssitemap.xml\n" % base)
    open(os.path.join(stage, ".htaccess"), "w", encoding="utf-8", newline="\n").write(htaccess(canon_host, args.www))

    # ---- 3. checks ------------------------------------------------------------------------
    problems = []
    for dirpath, _, filenames in os.walk(stage):
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, stage).replace("\\", "/")
            if name.endswith(TEXT_EXT) or name == ".htaccess":
                s = open(full, encoding="utf-8").read()
                if "github.io" in s or "TRM-Holidays-website" in s:
                    problems.append("old GitHub URL still in " + rel)
    for rel in kept:
        if rel.endswith(".html") and "/" not in rel:
            s = open(os.path.join(stage, rel), encoding="utf-8").read()
            for m in REF.finditer(s):
                u = next(g for g in m.groups() if g)
                if re.match(r"(https?:|//|mailto:|tel:|data:|javascript:)", u):
                    continue
                if not os.path.exists(os.path.join(stage, os.path.normpath(u))):
                    problems.append("%s links to missing file %s" % (rel, u))
            for blk in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', s, re.S):
                try:
                    json.loads(blk)
                except ValueError as e:
                    problems.append("bad JSON-LD in %s: %s" % (rel, e))
            if rel not in ("admin.html", "404.html"):
                for needed in ('rel="canonical"', 'property="og:title"', 'name="description"'):
                    if needed not in s and not (rel == "tour-detail.html" and needed == 'rel="canonical"'):
                        problems.append("%s is missing %s" % (rel, needed))
    xml.dom.minidom.parse(os.path.join(stage, "sitemap.xml"))
    json.load(open(os.path.join(stage, "site.webmanifest"), encoding="utf-8"))
    if problems:
        print("\nPROBLEMS - zip not written:")
        for p in problems:
            print("  -", p)
        shutil.rmtree(stage)
        sys.exit(1)

    # ---- 4. zip ---------------------------------------------------------------------------
    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.exists(OUT_ZIP):
        os.remove(OUT_ZIP)
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dirpath, _, filenames in os.walk(stage):
            for name in sorted(filenames):
                full = os.path.join(dirpath, name)
                arc = os.path.relpath(full, stage).replace("\\", "/")
                zi = zipfile.ZipInfo.from_file(full, arc)
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = (0o644 & 0xFFFF) << 16
                with open(full, "rb") as fh:
                    z.writestr(zi, fh.read())
    shutil.rmtree(stage)

    size = os.path.getsize(OUT_ZIP)
    print("Main address : " + base)
    print("Files in zip : %d" % (len(kept) + 3))
    print("Left out     : " + ", ".join(sorted(skipped)) if skipped else "Left out     : nothing")
    print("Zip          : %s (%.0f KB)" % (OUT_ZIP, size / 1024))


if __name__ == "__main__":
    main()
