import sys
import os
import json
from subprocess import check_output

from spire.wsgi import Mediator
from spire.core import Assembly

__all__ = ['CsiContextProcessor']

class CsiContextProcessor(Mediator):

    def fmt(s):
        indented = s.strip().replace('\n', '\n    ')
        return indented.replace('  </script>', '</script>')

    def cmd(c, with_prefix=True):
        use_shell = sys.platform.lower().startswith('win')
        split = c.split()
        if with_prefix:
            base = os.sep.join(['node_modules', '.bin', split[0]])
        else:
            base = split[0]
        return check_output([base] + split[1:], shell=use_shell)

    context = {
            'extra':     fmt(cmd('component template extra')),
            'config':    fmt(cmd('component template config')),
            'requirejs': fmt(cmd('component template requirejs')),
            }

    def mediate_request(self, request):
        if 'meshconf' not in self.context:
            mesh_bundles = {}
            for k, v in Assembly.current().configuration.iteritems():
                if k.startswith('mesh-proxy'):
                    mesh_bundles[k[11:]] = v['path']
            self.context['meshconf'] = '''
  <script>
    define('meshconf', {
        bundles: %s
    });
  </script>
            ''' % json.dumps(mesh_bundles)
        request.template_context.update(self.context)
