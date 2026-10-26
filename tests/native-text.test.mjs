import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
function invalidText(source){
  const ast=ts.createSourceFile('screen.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),errors=[];
  function visit(node){
    if(ts.isJsxText(node)){
      const parent=node.parent;
      const textParent=ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(ast)==='Text';
      // JSX retains single-line spaces between elements. Multi-line indentation
      // is stripped by the JSX transform; non-whitespace text always renders.
      if(!textParent&&(node.text.trim()||node.text.length&&!node.text.includes('\n')))errors.push(node.text);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);return errors;
}
test('native text guard catches an inter-element space, including fragments',()=>{
  assert.deepEqual(invalidText('<><View/> <View/></>'),[' ']);
  assert.deepEqual(invalidText('<View>Oops</View>'),['Oops']);
  assert.deepEqual(invalidText('<View><Text>Allowed text </Text></View>'),[]);
});
test('app screens have no text nodes outside native Text components',()=>{
  const root=new URL('../',import.meta.url);
  const files=['App.tsx',...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.tsx')).map(f=>join('src',f))];
  for(const file of files)assert.deepEqual(invalidText(readFileSync(new URL(file,root),'utf8')),[],file);
});
