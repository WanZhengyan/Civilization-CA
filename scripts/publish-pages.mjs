// GitHub Pages serves gh-pages at the root. Publish precisely the docs tree
// already on origin/main, keeping the previous Pages commit as the parent.
import {execFileSync} from 'node:child_process';

const git = (...args) => execFileSync('git',args,{encoding:'utf8'}).trim();
const mode = process.argv[2] || '--check';
if (!['--check','--publish'].includes(mode)) throw new Error('Choose --check or --publish.');
git('fetch','--quiet','--no-tags','origin',
  '+refs/heads/main:refs/remotes/origin/main',
  '+refs/heads/gh-pages:refs/remotes/origin/gh-pages');
const main = git('rev-parse','refs/remotes/origin/main');
const previous = git('rev-parse','refs/remotes/origin/gh-pages');
const siteTree = git('rev-parse',main+':docs');
const pagesTree = git('rev-parse',previous+'^{tree}');
for (const file of ['index.html','game.html','.nojekyll']) git('cat-file','-e',siteTree+':'+file);

if (siteTree===pagesTree) {
  console.log('GitHub Pages matches main/docs at '+main);
} else if (mode==='--check') {
  console.error('gh-pages is out of sync with main/docs at '+main);
  process.exitCode=1;
} else {
  const cname = tree => git('ls-tree',tree,'--','CNAME');
  if (cname(pagesTree) && cname(pagesTree)!==cname(siteTree)) {
    throw new Error('Resolve the custom-domain CNAME difference in main/docs before publishing.');
  }
  const next=git('commit-tree',siteTree,'-p',previous,'-m','Publish site from main '+main);
  // A normal push rejects a concurrent update to gh-pages.
  git('push','origin',next+':refs/heads/gh-pages');
  console.log('Published main/docs at '+main+' to gh-pages at '+next);
}
