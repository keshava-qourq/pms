"""Generated routers: one per architecture component that owns endpoints.

The approved architecture gives every endpoint to the single `backend`
component, so there is one router here: `backend.py`. A future architecture
that split endpoints across more components would add one module per
component, each mounted the same way in `app/main.py`.
"""
