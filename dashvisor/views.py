# coding=utf-8
import socket
from django.urls import reverse
from django.http import Http404, JsonResponse
from django.shortcuts import render

from dashvisor.backends import backend
from dashvisor.utils import login_admin_only_required

# safe for uls
process_group_separator = '-'


@login_admin_only_required
def dashboard(request):
    try:
        backend.refresh()
    except socket.error:
        pass
    return render(
        'dashvisor/dashboard.html',
        {
            'servers': backend.servers,
            'query_url': reverse('dashvisor_query'),
            'base_path': reverse("dashvisor_dashboard"),
            'constants': {
                'stopped': 0,
                'running': 20,
            },
        }
    )


class ControlAction(list):
    def __init__(self, request, name):
        super(ControlAction, self).__init__()
        self.request = request
        self.name = name
        self.extend([
            'start',
            'stop',
            'restart',
            'tail',
            'start_all',
            'restart_all',
            'stop_all',
            'supervisor_update',
            'supervisor_restart',
        ])

    @property
    def args(self):
        return []

    @property
    def kwargs(self):
        kwargs = {}
        method = getattr(self.request, self.request.method)
        attrs = {'offset': int, 'length': int}
        for name in attrs:
            if name in method:
                kwargs[name] = attrs[name](method[name])
        return kwargs

    def check_perm_or_404(self):
        if self.name not in self:
            raise Http404


@login_admin_only_required
def control(request, server_alias, process, action):
    action = ControlAction(request, action)
    action.check_perm_or_404()
    action_args = action.args
    process = process.replace(process_group_separator, ':')
    if process != '*':
        action_args.append(process)
    action_kwargs = action.kwargs
    if server_alias == '*':
        result = []
        for server_alias in backend.servers:
            server = backend.servers[server_alias]
            func = getattr(server, action.name)
            result.append(func(*action_args, **action_kwargs))
    else:
        func = getattr(backend.servers[server_alias], action.name)
        result = func(*action_args, **action_kwargs)
    return JsonResponse({
        'result': result,
    }, safe=False)


def _get_server_status(request, server, action):
    """get server status data"""
    if action == 'refresh':
        server.refresh()
    status = sorted(server.status.values(),
                    key=lambda x: (x['group'], x['name']))
    for process in status:
        process['id'] = process['id'].replace(':', process_group_separator)
        process['server'] = {
            'name': "{0.name} ({0.id})".format(server),
            'id': server.id
        }
    return status


@login_admin_only_required
def query(request):
    server_alias = request.GET.get('server_alias', '*')
    action = request.GET.get('action')
    data = {'data': []}
    if server_alias == "*":
        for server in backend.servers.values():
            status = _get_server_status(request, server, action)
            data['data'].extend(status)
    else:
        server = backend.servers[server_alias]
        status = _get_server_status(request, server, action)
        data['data'].extend(status)
    return JsonResponse(data, safe=False)
