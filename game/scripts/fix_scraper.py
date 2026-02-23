import re

with open('scrape_artworks.py', 'r') as f:
    code = f.read()

# Wikimedia blocks generic Python-requests User-Agents and occasionally requires fully compliant ones. 
# We'll update the User-Agent to be extremely specific.
code = code.replace(
    '"User-Agent": "ArtMarket/1.0 (art@example.com)"',
    '"User-Agent": "ArtMarketGameBot/1.0 (https://github.com/example/artmarket; art@example.com) Mozilla/5.0"'
)

with open('scrape_artworks.py', 'w') as f:
    f.write(code)
