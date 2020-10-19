from cached_property import cached_property
from django.conf import settings
from django.utils.module_loading import import_string


class Backend:
    def __init__(self):
        self.backend_path = getattr(settings, 'DASHVISOR_BACKEND',
                                    'dashvisor.backends.file.Backend')

    @cached_property
    def backend(self):
        return import_string(self.backend_path)()

    def __getattribute__(self, name):
        get_attribute = object.__getattribute__
        try:
            return get_attribute(self, name)
        except AttributeError:
            return getattr(get_attribute(self, "backend"), name)


backend = Backend()
