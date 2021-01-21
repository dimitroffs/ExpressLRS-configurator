# ExpressLRS-configurator

A simple way to build and flash https://github.com/AlessandroAU/ExpressLRS firmware. Project is on-going - use 'develop' branch for most recent stuff.

### Releases:
 - 0.1.3a - first windows-only application exported for test (needs python 3 locally installed)

### How to try it out (for development):
 - some basic development skills needed, due to development stage of the app
 - you need to install NodeJS (https://nodejs.org/en/) and Python (https://www.python.org/)
 - clone project locally
 - run 'npm install' from main project directory
 - run 'npm start' to start application

### Currently under the hood:
 - finished up main logic purposes
 - cloning ExpressLRS firmware locally
 - updating ExpressLRS firmware locally
 - building firmware targets
 - uploading firmware targets
 - better UX - powered by TailwindCSS
 
### What needs to be done: 
 - optimizing code (I am neither python nor js dev, so additional support will be highly appreciated)
 - better packaging (currently developing win application as a target)
