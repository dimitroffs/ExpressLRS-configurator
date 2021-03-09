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

#  This is ExpressLRS CLI application. Project is powered by Python, GitPython, PlatformIO and yaspin. Intended to work
#  as local build tool for ExpressLRS firmware, without the need to install development environment and use programming
#  languages and tools for configuration, build and upload of ExpressLRS firmware.

import argparse
import logging
import os
import subprocess
import sys
import pathlib

scriptpath = os.path.realpath(__file__)

# TODO: rename to configurator path
PROJECT_DIR = scriptpath[0:-len("/elrs-cli/elrs-cli.py")]
ELRS_REPO_DIR = os.path.join(PROJECT_DIR, 'ExpressLRS')

# TODO: windows only paths
GIT_EXEC_DIR_WIN = os.path.join(PROJECT_DIR, "setup", "win", "PortableGit-2.30.1-64-bit", "cmd")
PIO_EXEC_DIR_WIN = os.path.join(str(pathlib.Path.home()), ".platformio", "penv", "Scripts")

# Make sure environmental variables are put in the beginning of the PATH
os.environ["PATH"] = os.pathsep.join([GIT_EXEC_DIR_WIN]) + os.pathsep + os.environ["PATH"]
os.environ["PATH"] = os.pathsep.join([PIO_EXEC_DIR_WIN]) + os.pathsep + os.environ["PATH"]

# Organize folder names
srcdir = os.path.join(PROJECT_DIR, "ExpressLRS", "src")

# Logger config
loggerfilename = os.path.join(PROJECT_DIR, "elrs-cli.log")
# logging.basicConfig(filename=loggerfilename, encoding='utf-8', level=logging.DEBUG,
#                     format='%(asctime)s %(name)-8s %(levelname)-8s %(message)s', datefmt='%y-%m-%d %H:%M:%S')
logging.basicConfig(handlers=[logging.FileHandler(filename=loggerfilename, 
                                                 encoding='utf-8', mode='a+')],
                    format="%(asctime)s %(name)s:%(levelname)s:%(message)s", 
                    datefmt="%F %A %T", 
                    level=logging.DEBUG)
logger = logging.getLogger('elrs-cli')

# Initialize argument parser for ExpressLRS CLI
parser = argparse.ArgumentParser()
parser.add_argument("-c", "--clone", action="store_true", help="clone ExpressLRS GitHub repository locally")
parser.add_argument("-p", "--pull", type=str, help="pull latest changes locally from ExpressLRS GitHub repository master branch")
parser.add_argument("-r", "--reset", type=str, help="reset ExpressLRS to specific branch")
parser.add_argument("-t", "--target", type=str, help="specify ExpressLRS build/upload target for PlatformIO")
parser.add_argument("-b", "--build", action="store_true", help="build ExpressLRS firmware for specified target")
parser.add_argument("-u", "--upload", action="store_true", help="upload ExpressLRS firmware for specified target")
args = parser.parse_args()

# Github clone whole ExpressLRS repository function
def cloneElrsGithubRepo():
    logger.debug("Cloning ExpressLRS GitHub repository in local directory: {PROJECT_DIR}")

    subprocess.check_call(['git', '--version'])
    subprocess.check_call(['git', 'clone', '--filter=blob:none', '--sparse', 'https://github.com/AlessandroAU/ExpressLRS.git'])
    
    os.chdir(ELRS_REPO_DIR)
    
    subprocess.check_call(['git', 'sparse-checkout', 'init', '--cone'])
    subprocess.check_call(['git', 'sparse-checkout', 'set', 'src'])
    subprocess.check_call(['git', 'config', 'pull.rebase', 'false'])
    subprocess.check_call(['git', 'fetch', '--all'])
    subprocess.check_call(['git', 'fetch', '--tags'])

    logger.debug("Successfully cloned latest ExpressLRS changes from GitHub repository 'master' branch")


# Github pull latest ExpressLRS repository master branch function
def pullElrsGithubRepo(branch):
    logger.debug("Fetching latest ExpressLRS changes from GitHub repository")
    
    os.chdir(ELRS_REPO_DIR)

    subprocess.check_call(['git', '--version'])
    subprocess.check_call(['git', 'fetch', '--all'])
    subprocess.check_call(['git', 'fetch', '--tags'])

    logger.debug(f"Pulling latest ExpressLRS changes from GitHub repository {branch} branch")

    subprocess.check_call(['git', 'merge', f'origin/{branch}'])

    logger.debug(f"Successfully got latest ExpressLRS changes from GitHub repository {branch} branch")


# Reset current ExpressLRS local repository to specific branch
def resetElrsLocalRepositoryToBranch(branch):
    logger.info(f"Resetting ExpressLRS local repository to remote '{branch}' branch")

    os.chdir(ELRS_REPO_DIR)

    subprocess.check_call(['git', '--version'])
    subprocess.check_call(['git', 'reset', '--hard', 'origin/' + branch])

    logger.info(f"Successfully reset ExpressLRS local repository to remote '{branch}' branch")


# ExpressLRS PlatformIO build target function
def pioBuild(target):
    if target is None:
        logger.info("ExpressLRS CLI '-b (build)' needs '-t (target)' parameter")
        exit(1)
    else:
        logger.info(f"ExpressLRS CLI build target: {target}")
        logger.info("Executing PlatformIO CLI 'build' from directory [{srcdir}] for ExpressLRS target [{target}] firmware")
        subprocess.check_call(['pio', 'run', '--project-dir', srcdir, '--environment', target])
        logger.info("Successfully executed PlatformIO CLI 'build' for ExpressLRS target [{target}] firmware")


# ExpressLRS PlatformIO upload target function
def pioUpload(target):
    if target is None:
        logger.info("ExpressLRS CLI '-u (upload)' needs '-t (target)' parameter")
        sys.exit(1)
    else:
        logger.info("Executing PlatformIO CLI 'upload' from directory [{srcdir}] for ExpressLRS target [{target}] firmware")
        subprocess.check_call(['pio', 'run', '--project-dir', srcdir, '--target', 'upload', '--environment', target])
        logger.info("Successfully executed PlatformIO CLI 'upload' for ExpressLRS target [{target}] firmware")


if args.clone:
    cloneElrsGithubRepo()
    sys.exit(0)

if args.pull:
    branch = args.pull
    pullElrsGithubRepo(branch)
    sys.exit(0)

if args.reset:
    branch = args.reset
    resetElrsLocalRepositoryToBranch(branch)
    sys.exit(0)

# fetch build/upload target from CLI args
target = args.target

if args.build:
    pioBuild(target)
    sys.exit(0)

if args.upload:
    pioUpload(target)
    sys.exit(0)
