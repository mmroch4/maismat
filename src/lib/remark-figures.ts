// Turns `![alt](image.jpg "Caption")`, alone in a paragraph, into a <figure> with a <figcaption>,
// so that authors writing Markdown get captions without HTML.
import type { Image, Paragraph, Root } from 'mdast';
import { visit } from 'unist-util-visit';

export default function remarkFigures() {
  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph) => {
      const [image] = node.children;
      if (node.children.length !== 1 || image.type !== 'image' || !image.title) return;
      const caption = image.title;
      (image as Image).title = null;
      node.data = { hName: 'figure' };
      node.children = [
        image,
        {
          type: 'text',
          value: caption,
          data: { hName: 'figcaption', hChildren: [{ type: 'text', value: caption }] },
        },
      ];
    });
  };
}
