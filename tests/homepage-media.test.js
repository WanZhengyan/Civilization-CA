import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const site = new URL('../docs/', import.meta.url);
const staticHome = new URL('index.html', site);
const isPages = existsSync(staticHome);
const homepage = readFileSync(isPages ? staticHome : new URL('../app/campaign-document.html', site), 'utf8');
const guideDir = new URL(isPages ? '../' : '../project-template/', site);
const readmes = ['README.md', 'README.zh-CN.md'].map(name => readFileSync(new URL(name, guideDir), 'utf8'));
const version = JSON.parse(readFileSync(new URL('package.json', guideDir), 'utf8')).version;

function attribute(tag, name) {
  const match = tag.match(new RegExp('\\s' + name + '="([^"]+)"'));
  assert.ok(match, 'Expected ' + name + ' on ' + tag);
  return match[1];
}

test('the homepage, campaign setup and README guides identify the same release', () => {
  const game = readFileSync(new URL('game.html', site), 'utf8');
  const notes = readFileSync(new URL('CHANGELOG.md', guideDir), 'utf8');
  const release = 'v' + version;
  for (const page of [homepage, game]) {
    const header = page.match(/<header\b[\s\S]*?<\/header>/)[0];
    assert.ok(header.includes('>' + release + '</a>'));
  }
  for (const readme of readmes) assert.ok(readme.includes('[' + release + ' '));
  assert.ok(notes.match(/^## .+$/m)[0].startsWith('## ' + release + ' '));
});

test('each homepage screen opens its full capture and matches the README in the selected language', () => {
  const panels = homepage.match(/<article\b[^>]*data-screen="[^"]+"[^>]*>[\s\S]*?<\/article>/g);
  assert.ok(panels?.length >= 3);
  for (const panel of panels) {
    const image = panel.match(/<img\b[^>]*>/)[0];
    const links = panel.match(/<a\b[^>]*href="[^"]+\.webp"[^>]*>/g);
    const urls = [attribute(image, 'src'), attribute(image, 'data-zh-src')];
    assert.ok(links?.length);
    for (const link of links) {
      assert.deepEqual([attribute(link, 'href'), attribute(link, 'data-zh-href')], urls);
    }
    const captures = urls.map((url, language) => {
      assert.ok(readmes[language].includes('./docs/' + url.slice(2)), url);
      const bytes = readFileSync(new URL(url, site));
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      return bytes;
    });
    assert.ok(!captures[0].equals(captures[1]), 'Expected separate English and Chinese captures');
  }
});

test('the homepage and both README walkthrough links lead to published MP4 files', () => {
  const link = homepage.match(/<a\b[^>]*data-zh-href="[^"]+\.mp4"[^>]*>/)[0];
  const urls = [attribute(link, 'href'), attribute(link, 'data-zh-href')];
  for (const [language, url] of urls.entries()) {
    assert.ok(readmes[language].includes('/' + url.slice(2)), url);
    const video = readFileSync(new URL(url, site));
    assert.equal(video.toString('ascii', 4, 8), 'ftyp');
  }
});
