"""
ASGI config for backend project.

Trimmed down for the extracted ticket-form-builder project: only wires up
the csm app's own websocket route (agent ticket/conversation notifications).
The original mediaJira asgi.py also routed websockets for asset/chat/
meetings/portal, none of which are part of this project - see README
"Known simplifications". Local dev can also just use `manage.py runserver`
(plain WSGI) since csm's `channel_layer.group_send()` calls degrade
gracefully to a no-op when nothing is subscribed.

It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from csm.routing import websocket_urlpatterns as csm_websocket_urlpatterns
from core.ws_auth_middleware import JWTAuthMiddleware


application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            csm_websocket_urlpatterns
        )
    ),
})
