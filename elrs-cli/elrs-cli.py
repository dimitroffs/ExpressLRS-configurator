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

scriptpath = os.path.realpath(__file__)

# TODO: rename to configurator path
PROJECT_DIR = scriptpath[0:-len("/elrs-cli/elrs-cli.py")]
ELRS_REPO_DIR = os.path.join(PROJECT_DIR, 'ExpressLRS')

GIT_EXEC_DIR = os.path.join(PROJECT_DIR, "setup", "win", "PortableGit-2.30.1-64-bit", "cmd")
# Make sure it's at the beginning of the PATH
os.environ["PATH"] = os.pathsep.join([GIT_EXEC_DIR]) + os.pathsep + os.environ["PATH"]
# NOW import it

# import git

# gitVersion = git.cmd.Git(PROJECT_DIR + '/ExpressLRS').version_info

# from yaspin import yaspin

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
parser.add_argument("-p", "--pull", action="store_true",
                    help="pull latest changes locally from ExpressLRS GitHub repository master branch")
parser.add_argument("-l", "--list", action="store_true", help="list ExpressLRS GitHub repository branches")
parser.add_argument("-r", "--reset", type=str, help="reset ExpressLRS to specific branch")
parser.add_argument("-t", "--target", type=str, help="specify ExpressLRS build/upload target for PlatformIO")
parser.add_argument("-b", "--build", action="store_true", help="build ExpressLRS firmware for specified target")
parser.add_argument("-u", "--upload", action="store_true", help="upload ExpressLRS firmware for specified target")
args = parser.parse_args()

# Github clone whole ExpressLRS repository function
# @yaspin(text="[ExpressLRS clone] ", color="cyan")
def cloneElrsGithubRepo():
    # logger.debug("Using Git version: {0}".format(gitVersion))
    logger.debug("Cloning ExpressLRS GitHub repository in local directory: {PROJECT_DIR}")

    subprocess.check_call(['git', '--version'])
    subprocess.check_call(['git', 'clone', '--filter=blob:none', '--sparse', 'https://github.com/AlessandroAU/ExpressLRS.git'])
    
    os.chdir(ELRS_REPO_DIR)
    
    subprocess.check_call(['git', 'sparse-checkout', 'init', '--cone'])
    subprocess.check_call(['git', 'sparse-checkout', 'set', 'src'])
    subprocess.check_call(['git', 'config', 'pull.rebase', 'true'])

    # git.cmd.Git(PROJECT_DIR).clone("https://github.com/AlessandroAU/ExpressLRS.git")
    logger.debug("Successfully cloned latest ExpressLRS changes from GitHub repository 'master' branch")


# Github pull latest ExpressLRS repository master branch function
# @yaspin(text="[ExpressLRS pull] ", color="cyan")
def pullElrsGithubRepo():
    # logger.debug("Using Git version: {0}".format(gitVersion))
    logger.debug("Pulling latest ExpressLRS changes from GitHub repository 'master' branch")
    
    os.chdir(ELRS_REPO_DIR)

    subprocess.check_call(['git', '--version'])
    subprocess.check_call(['git', 'pull'])

    # logger.info(git.cmd.Git(PROJECT_DIR + '/ExpressLRS').pull('origin', 'master'))
    
    logger.debug("Successfully got latest ExpressLRS changes from GitHub repository 'master' branch")


# Helper function to get all ExpressLRS remote branches from GitHub repository
# def fetchElrsGithubRepoBranches():
#     try:
#         logger.info("Fetching latest ExpressLRS branches from GitHub repository")
#         localRepo = git.cmd.Git(PROJECT_DIR + '/ExpressLRS')
#         localRepo.fetch('--all')
#         allRemoteBranches = localRepo.branch('-r').split('\n')
#         allRemoteBranchesNames = [b.strip() for b in allRemoteBranches]
#         logger.info(f"Successfully fetched total {len(allRemoteBranchesNames)} ExpressLRS branches from GitHub repository")

#         # HEAD is not needed in this list
#         remoteBranchesNames = [ b for b in allRemoteBranchesNames if not 'origin/HEAD' in b]
#         logger.info(f"Only {len(remoteBranchesNames)} ExpressLRS branches useful from origin")

#         return remoteBranchesNames
#     except Exception as e:
#         logger.error("Unable to fetch ExpressLRS GirHub repository branches")
#         return []


# # Reset current ExpressLRS local repository to specific branch
# def resetElrsLocalRepositoryToBranch(branch):
#     logger.info(f"Resetting ExpressLRS local repository to remote '{branch}' branch")
#     logger.info(git.cmd.Git(PROJECT_DIR + '/ExpressLRS').reset('--hard', branch))
#     logger.info(f"Successfully reset ExpressLRS local repository to remote '{branch}' branch")


# ExpressLRS PlatformIO build target function
def pioBuild(target):
    if target is None:
        logger.info("ExpressLRS CLI '-b (build)' needs '-t (target)' parameter")
        exit(1)
    else:
        logger.info(f"ExpressLRS CLI build target: {target}")
        pullElrsGithubRepo()
        logger.info("Executing PlatformIO CLI 'build' from directory [{srcdir}] for ExpressLRS target [{target}] firmware")
        subprocess.check_call(['pio', 'run', '--project-dir', srcdir, '--environment', target])
        logger.info("Successfully executed PlatformIO CLI 'build' for ExpressLRS target [{target}] firmware")


# ExpressLRS PlatformIO upload target function
def pioUpload(target):
    if target is None:
        logger.info("ExpressLRS CLI '-u (upload)' needs '-t (target)' parameter")
        exit(1)
    else:
        pullElrsGithubRepo()
        logger.info("Executing PlatformIO CLI 'upload' from directory [{srcdir}] for ExpressLRS target [{target}] firmware")
        subprocess.check_call(['pio', 'run', '--project-dir', srcdir, '--target', 'upload', '--environment', target])
        logger.info("Successfully executed PlatformIO CLI 'upload' for ExpressLRS target [{target}] firmware")


if args.clone:
    cloneElrsGithubRepo()
    exit(0)

if args.pull:
    pullElrsGithubRepo()
    exit(0)

if args.list:
    # print(fetchElrsGithubRepoBranches())
    exit(0)

if args.reset:
    branch = args.reset
    # resetElrsLocalRepositoryToBranch(branch)
    exit(0)

# fetch build/upload target from CLI args
target = args.target

if args.build:
    pioBuild(target)
    exit(0)

if args.upload:
    pioUpload(target)
    exit(0)
