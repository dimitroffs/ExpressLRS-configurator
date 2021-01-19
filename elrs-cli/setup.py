#  Copyright 2021 Dimitar Dimitrov | MIT License
#
#  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
#  associated documentation files (the "Software"), to deal in the Software without restriction, including
#  without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
#  of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following
#  conditions:
#
#  The above copyright notice and this permission notice shall be included in all copies or substantial
#  portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
#  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
#  PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
#  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
#  OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
#  OTHER DEALINGS IN THE SOFTWARE.

#  This is ExpressLRS CLI setup application. Intended to work setup all needed libraries for ExpressLRS CLI python project.

import argparse
import os
import logging
import subprocess
import sys

# Declare constants
VENV_PARENT_DIR = "elrs-cli"
VENV_DIR = os.path.join(VENV_PARENT_DIR, "venv")


# Organize folder names
scriptpath = os.path.realpath(__file__)
elrsrepopath = scriptpath[0:-len("/elrs-cli/setup.py")]

# Logger config
loggerfilename = os.path.join(elrsrepopath, "elrs-cli.log")
logging.basicConfig(filename=loggerfilename, encoding='utf-8', level=logging.DEBUG,
                    format='%(asctime)s %(name)-8s %(levelname)-8s %(message)s', datefmt='%y-%m-%d %H:%M:%S')
logger = logging.getLogger('setup')

# Initialize argument parser for ExpressLRS CLI setup
parser = argparse.ArgumentParser()
parser.add_argument("-s", "--setup", action="store_true", help="setup ExpressLRS Python 3 venv locally")
parser.add_argument("-a", "--activate", action="store_true", help="activate ExpressLRS Python 3 venv locally")
parser.add_argument("-d", "--deactivate", action="store_true", help="deactivate ExpressLRS Python 3 venv locally")
args = parser.parse_args()

# Python pip install or update package function
def pipInstallOrUpdate(package):
    logger.info("Executing 'pip install -U {}'".format(package))
    subprocess.check_call(['pip', 'install', '-U', package])
    logger.info("Successfully executed 'pip install -U {}'".format(package))

def activateVenv():
    # TODO: check os and apply correct path
    logger.info("Activating Python 3 venv for ExpressLRS CLI")
    subprocess.check_call(['.\elrs-cli\\venv\Scripts\\activate.bat'], shell=True)

def deactivateVenv():
    # TODO: check os and apply correct path
    logger.info("Deactivating Python 3 venv for ExpressLRS CLI")
    subprocess.check_call(['.\elrs-cli\\venv\Scripts\\deactivate.bat'], shell=True)

def setupVenv():
    logger.info("Starting setup Python 3 venv for ExpressLRS CLI")

    cwd = os.getcwd()
    os.chdir(cwd)
    venv = os.path.join(cwd, VENV_DIR)

    logger.info("Creating Python 3 venv for ExpressLRS CLI")
    subprocess.check_call([sys.executable, '-m', 'venv', VENV_DIR], shell=True)

    # activate venv
    activateVenv()

    logger.info("Updating pip package manager")
    subprocess.check_call(['python', '-m', 'pip', 'install', '--upgrade', 'pip'], shell=True)

    # install GitPython
    pipInstallOrUpdate('gitpython')

    # install yaspin
    pipInstallOrUpdate('yaspin')

    # install PlatformIO
    pipInstallOrUpdate('platformio')

    logger.info("Finished setup Python 3 venv for ExpressLRS CLI")

if args.setup:
    setupVenv()
    exit(0)

if args.activate:
    activateVenv()
    exit(0)

if args.deactivate:
    deactivateVenv()
    exit(0)