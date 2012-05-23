import json

from scheme import Sequence, Text

from spire.core import Assembly, Configuration, Unit
from spire.util import get_package_data
from spire.wsgi import Mediator

__all__ = ['CsiContextProcessor']

MESHCONF_SCRIPT = """
  <script>
    define('meshconf', {
      bundles: %s
    });
  </script>
"""

class CsiContextProcessor(Unit, Mediator):
    configuration = Configuration({
        'sources': Sequence(Text(nonnull=True))
    })

    def __init__(self, sources):
        self.context = {}
        for source in sources or []:
            content = get_package_data(source)
            self.context.update(json.loads(content))

        if 'meshconf' not in self.context:
            mesh_bundles = {}
            for k, v in Assembly.current().configuration.iteritems():
                if k.startswith('mesh-proxy'):
                    mesh_bundles[k[11:]] = v['path']
            self.context['meshconf'] = MESHCONF_SCRIPT % json.dumps(mesh_bundles)

    def mediate_request(self, request):
        request.template_context.update(self.context)
