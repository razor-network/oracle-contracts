How to contribute
===================

The preferred way to contribute is to fork the main repository on GitHub, then submit a “pull request” (PR).

Create an account on GitHub if you do not already have one.

Fork the project repository: click on the ‘Fork’ button near the top of the page. This creates a copy of the code under your account on the GitHub user account. For more details on how to fork a repository see this guide.

Clone your fork of the repo from your GitHub account to your local disk:

```
$ git clone git@github.com:YourLogin/contracts.git
$ cd contracts
```
Install the development dependencies:
```
$ npm i
```
for more details about installation, see the Readme.

Add the upstream remote. This saves a reference to the main contracts repository, which you can use to keep your repository synchronized with the latest changes:
```
$ git remote add upstream git@github.com:razor-network/contracts.git
```
You should now have a working installation, and your git repository properly configured. The next steps now describe the process of modifying code and submitting a PR:

Synchronize your master branch with the upstream master branch:
```
$ git checkout master
$ git pull upstream master
```
Create a feature branch to hold your development changes:
```
$ git checkout -b my_feature
```
and start making changes. Always use a feature branch. It’s good practice to never work on the master branch!

Develop the feature on your feature branch on your computer, using Git to do the version control. When you’re done editing, add changed files using git add and then git commit:
```
$ git add modified_files
$ git commit
```
to record your changes in Git, then push the changes to your GitHub account with:
```
$ git push -u origin my_feature
```
Follow these instructions to create a pull request from your fork. This will send an email to the committers. You may want to consider sending an email to the mailing list for more visibility.

It is often helpful to keep your local feature branch synchronized with the latest changes of the main  repository:
```
$ git fetch upstream
$ git merge upstream/master
```
Subsequently, you might need to solve the conflicts. You can refer to the Git documentation related to resolving merge conflict using the command line.

Learning git:
---

The Git documentation and http://try.github.io are excellent resources to get started with git, and understanding all of the commands shown here.
