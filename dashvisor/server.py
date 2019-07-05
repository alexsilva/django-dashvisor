from collections import OrderedDict
from urlparse import urlparse
from xmlrpclib import ServerProxy, Fault


class Server(object):
    def __init__(self, connection_string, id):
        self.name = urlparse(connection_string).hostname
        self.connection = ServerProxy(connection_string)
        self.status = OrderedDict()
        self.id = id

    def refresh(self):
        self.status = OrderedDict(("%s:%s" % (i['group'], i['name']), i)
                                  for i in self.connection.supervisor.getAllProcessInfo())
        for key, program in self.status.items():
            program['id'] = key
            program['human_name'] = program['name']
            if program['name'] != program['group']:
                program['human_name'] = "%s:%s" % (program['group'], program['name'])

    def stop(self, name):
        try:
            return self.connection.supervisor.stopProcess(name)
        except Fault, e:
            if e.faultString.startswith('NOT_RUNNING'):
                return False
            raise

    def start(self, name):
        try:
            return self.connection.supervisor.startProcess(name)
        except Fault, e:
            if e.faultString.startswith('ALREADY_STARTED'):
                return False
            raise

    def start_all(self):
        return self.connection.supervisor.startAllProcesses()

    def restart(self, name):
        self.stop(name)
        return self.start(name)
