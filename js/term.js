(function() {
     /**
      * Kind of an ad-hoc representation of a filesystem. Each node should
      * have at least a 'type' (of Term.types.dir, Term.types.file, or
      * Term.types.link) and a 'perm', which is a sum (or OR) of Term.perms.read,
      * Term.perms.write, and Term.perms.exec. I don't expect to see
      * Term.perms.write here, but hey, maybe.
      *
      * If something has Term.perms.read, it should have 'contents'.  A file
      * should have an array of strings, and a directory should have more nodes
      * underneath it.
      *
      * If something has Term.perms.exec, it should have an 'exec' function,
      * which accepts an array of arguments like argv, and does something.
      */
     var fs = {
         type: Term.types.dir,
         perm: Term.perms.read,
         contents: {
             bin: {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     cat: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             var argv = $.makeArray(arguments);
                             var term = this;
                             $.each(argv, function() {
                                        var node = term.pathtonode(this);
                                        if (node in term.errnos) {
                                            term.println(this + ': ' +
                                                         term.errnos[node]);
                                        } else if (node.type == term.types.file) {
                                            $.each(node.contents, function(i, line) {
                                                       term.println(line);
                                                   });
                                        } else if (node.type == term.types.link) {
                                            term.println(
                                                term.show(node.contents[0], node));
                                        } else if (node.type == term.types.dir) {
                                            term.println(this + ': ' +
                                                         term.errnos['EISDIR']);
                                        } else {
                                            term.println('cat: Unknown error.');
                                            return false;
                                        }
                                        return true;
                                    });
                         }
                     },
                     cd: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             var argv = $.makeArray(arguments);
                             if (argv.length == 0) {
                                 var node = this.pathtonode(
                                     this.env['HOME']);
                                 if (node in this.errnos) {
                                     this.println(argv[0] + ': ' +
                                                  this.errnos[node]);
                                 } else if (node.type == this.types.file ||
                                            node.type == this.types.link) {
                                     this.println(argv[0] + ': ' +
                                                  this.errnos['ENOTDIR']);
                                 } else if (node.type == this.types.dir) {
                                     this.env['PWD'] = this.env['HOME'];
                                 } else {
                                     this.println('cd: Unknown error.');
                                 }
                             } else if (argv.length == 1) {
                                 var node = this.pathtonode(argv[0]);
                                 if (node in this.errnos) {
                                     this.println(argv[0] + ': ' +
                                                  this.errnos[node]);
                                 } else if (node.type == this.types.file ||
                                            node.type == this.types.link) {
                                     this.println(argv[0] + ': ' +
                                                  this.errnos['ENOTDIR']);
                                 } else if (node.type == this.types.dir) {
                                     this.env['PWD'] = this.abspath(argv[0]);
                                 } else {
                                     this.println('cd: Unknown error.');
                                 }
                             } else {
                                 this.println('cd: ' + this.errnos['EINVAL']);
                             }
                         }
                     },
                     help: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             // TODO: help for commands
                             var term = this;
                             this.println('jsh (http://github.com/adlaiff6/jsh/) help:');
                             this.println('  available commands:');
                             $.each(this.env['PATH'].split(':'),
                                    function() {
                                        var node = term.pathtonode(this);
                                        if (!node || node in term.errnos) {
                                            return false;
                                        }
                                        $.each(node.contents, function(name, node) {
                                                   term.print('    ');
                                                   term.println(
                                                       term.show(name, node));
                                               });
                                        return true;
                                    });
                             this.println();
                             this.println('  All commands are their unix equivalents (but with no options), except the');
                             this.println('  following:');
                             this.println();
                             this.println("  `mail' will actually send me a message, with the subject being the rest of the");
                             this.println('  command.');
                             this.println();
                             this.println("  `readlink' opens the link in a new tab.  You can cat links to find out where");
                             this.println('  they go, or just click on them in a directory listing.');
                             this.println();
                             this.println('  (Most of) my projects hosted on github are in ~/src.  Some of these are');
                             this.println('  websites, which are running.  You can find these in /var/www or ~/wwwroot.  My');
                             this.println('  other homepage is also there.');
                         }
                     },
                     ls: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             var argv = $.makeArray(arguments);
                             var term = this;
                             var multiple_args = (argv.length > 1);
                             if (argv.length == 0) {
                                 argv.push(this.env['PWD']);
                             }
                             $.each(argv, function(i, name) {
                                        var node = term.pathtonode(this);
                                        if (node in term.errnos) {
                                            term.println(this + ': ' +
                                                         term.errnos[node]);
                                        } else if (node.type == term.types.file ||
                                                   node.type == term.types.link) {
                                            term.println(
                                                term.show(name, node));
                                        } else if (node.type == term.types.dir) {
                                            if (multiple_args) {
                                                if (i > 0) {
                                                    term.println();
                                                }
                                                term.write(this + ':');
                                            }
                                            $.each(node.contents, function(name) {
                                                       term.println(
                                                           term.show(name, this));
                                                   });
                                        } else {
                                            term.println('ls: Unknown error.');
                                            return false;
                                        }
                                        return true;
                                    });
                         }
                     },
                     mail: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             var argv = $.makeArray(arguments);
                             var url = 'mailto:leif.walsh@gmail.com?Subject=' + argv.join('+');
                             var opened = window.open(url, '_blank');
                             opened.focus();
                             return false;
                         }
                     },
                     pwd: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             this.println(this.canonpath(this.env['PWD']));
                         }
                     },
                     readlink: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             var argv = $.makeArray(arguments);
                             var node = this.pathtonode(argv[0]);
                             if (node in this.errnos) {
                                 this.println(argv[0] + ': ' +
                                              this.errnos[node]);
                             } else if (node.type == this.types.link) {
                                 var opened = window.open(node.contents[0], '_blank');
                                 opened.focus();
                             } else if (node.type != this.types.file ||
                                        node.type != this.types.dir) {
                                 this.println('readlink: Unknown error.');
                             }
                         }
                     },
                     whoami: {
                         type: Term.types.file,
                         perm: Term.perms.read + Term.perms.exec,
                         contents: ['binary file'],
                         exec: function() {
                             this.println(this.env['USER']);
                         }
                     }
                 }
             },
             etc: {
                 type: Term.types.dir,
                 perm: Term.perms.nil
             },
             home: {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     leif: {
                         type: Term.types.dir,
                         perm: Term.perms.read,
                         contents: {
                             '.dotfiles': {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://github.com/adlaiff6/df']
                             },
                             '.gpgkey': {
                                 type: Term.types.file,
                                 perm: Term.perms.read,
                                 contents: ['F5709C49',
                                            '4128 886C B038 E390 347C 8B16 7C1A 971A F570 9C49']
                             },
                             '.plan': {
                                 type: Term.types.file,
                                 perm: Term.perms.read,
                                 contents: ['Currently in Paris, doing an exchange program at EFREI (efrei.fr).  Returning to',
                                            'US at the end of January, to finish undergrad.  From there, grad school,',
                                            'hopefully in math.  Available for internships in math or cs; see contact/cv.']
                             },
                             '.project': {
                                 type: Term.types.file,
                                 perm: Term.perms.read,
                                 contents: ['Wandering around Paris, feeding birds and stuff.']
                             },
                             core: {
                                 type: Term.types.file,
                                 perm: Term.perms.read,
                                 contents: ['binary file']
                             },
                             contact: {
                                 type: Term.types.dir,
                                 perm: Term.perms.read,
                                 contents: {
                                     cv: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://leifwalsh.com/walsh-cv.pdf']
                                     },
                                     email: {
                                         type: Term.types.file,
                                         perm: Term.perms.read,
                                         contents: [
                                             'leif.walsh@gmail.com',
                                             'rlwalsh@ic.sunysb.edu',
                                             'walsh@efrei.fr'
                                         ]
                                     }
                                 }
                             },
                             src: {
                                 type: Term.types.dir,
                                 perm: Term.perms.read,
                                 contents: {
                                     axs: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/axs/']
                                     },
                                     cleif: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/cleif/']
                                     },
                                     format_string: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/format_sting/']
                                     },
                                     jsh: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/jsh/']
                                     },
                                     memeshup: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/memeshup/']
                                     },
                                     'readline.js': {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/readline.js/']
                                     },
                                     rethinkdb: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://www.rethinkdb.com/']
                                     },
                                     thedecider: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/thedecider/']
                                     },
                                     tzrss: {
                                         type: Term.types.link,
                                         perm: Term.perms.read,
                                         contents: ['http://github.com/adlaiff6/tzrss/']
                                     }
                                 }
                             }
                         }
                     }
                 }
             },
             lib: {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     'libcleif.a': {
                         type: Term.types.link,
                         perm: Term.perms.read,
                         contents: ['http://github.com/adlaiff6/cleif/']
                     }
                 }
             },
             'lost+found': {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     sanity: {
                         type: Term.types.file,
                         perm: Term.perms.nil
                     }
                 }
             },
             root: {
                 type: Term.types.dir,
                 perm: Term.perms.nil
             },
             tmp: {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     emacs1000: {
                         type: Term.types.dir,
                         perm: Term.perms.read,
                         contents: {
                             server: {
                                 type: Term.types.file,
                                 perm: Term.perms.nil
                             }
                         }
                     }
                 }
             },
             'var': {
                 type: Term.types.dir,
                 perm: Term.perms.read,
                 contents: {
                     www: {
                         type: Term.types.dir,
                         perm: Term.perms.read,
                         contents: {
                             'adlaiff6.github.com': {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://adlaiff6.github.com/']
                             },
                             home: {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://leifwalsh.com/']
                             },
                             memeshup: {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://ms.leifwalsh.com/']
                             },
                             morningbell: {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://mb.leifwalsh.com/']
                             },
                             thedecider: {
                                 type: Term.types.link,
                                 perm: Term.perms.read,
                                 contents: ['http://td.leifwalsh.com/']
                             }
                         }
                     }
                 }
             }
         }
     };

     var env = {
         HOME: '/home/leif',
         PATH: '/bin',
         USER: 'leif',
         HOSTNAME: 'github',
         PWD: '/home/leif'
     };

     var motd = [
         'Welcome to jsh! (jsh-0.1, readline.js-0.1)',
         "Type `help' for a list of commands.",
         'You are in a fairly restricted environment.',
         'You are likely to be eaten by a grue.'
     ];

     Terminit = function() {
         // an actual symlink
         fs.contents['home'].contents['leif'].contents['wwwroot'] = fs.contents['var'].contents['www'];
         var term = new Term(fs, env, $('#output'), $('#prompt'), $('#input'));
         for (var i in motd) {
             term.println(motd[i]);
         }
     };
 })();