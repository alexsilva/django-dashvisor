try:
    from django.urls import re_path as url
except ImportError:
    from django.conf.urls import url
from dashvisor import views

urlpatterns = [
    url(r'^$', views.dashboard, name='dashvisor_dashboard'),
    url(r'^control/(?P<server_alias>[a-z0-9\.*]+)/(?P<process>[a-z:_\-*]+)/(?P<action>[a-z_]+)/$',
        views.control, name='dashvisor_control'),
    url(r'^query/$', views.query, name='dashvisor_query'),
]

