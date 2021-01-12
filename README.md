# ExpressLRS-configurator

A simple way to build and flash https://github.com/AlessandroAU/ExpressLRS firmware. Project is on-going - use 'develop' branch for most recent stuff.

### How to try it out:
 - clone project locally
 - run 'npm install' from main project directory
 - 'elrs-cli/' directory is basic python project with virtualenv interpreter. Setup locally using PyCharm or cli so directory contains all needed libs and executable scripts:
  - pip, gitpython, yaspin, platformio
 - run 'npm start' to start application

### Currently under the hood:
 - cloning ExpressLRS firmware locally
 - updating ExpressLRS firmware locally
 - building firmware targets
 - uploading firmware targets
 
### What needs to be done:
 - finish up main logic purposes
 - better UX (will integrate tailwind.css as first step)
 - optimizing code (I am neither python nor js dev, so additional support will be highly appreciated)
 - better packaging (currently developing win application as a target)
 - improved elrs-cli (ExpressLRS CLI module is currently included directly in project - think it will be better if it is seperately supported and packaged)
 - aob
