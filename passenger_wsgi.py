#! /usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os
INTERP = os.path.join(os.environ['HOME'], 'uat.wolba.ch', 'bin', 'python3')
#INTERP is present twice so that the new Python interpreter knows the actual executable path
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

from sortingtool import app as application
#application = loadapp('config:/home/path/to/site/production.ini')