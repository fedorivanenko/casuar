Source: https://github.com/fedorivanenko/casuar-do-calculus
Pinned commit: 428295bfb127be2bc39bd847474f107ddc9f109f

Vendored core.py, endpoint.py, examples/model.json. The only source adaptation is
`from core import` -> `from .core import` in endpoint.py. Update these files together
from a reviewed upstream commit and rerun upstream tests. No runtime code downloads.
