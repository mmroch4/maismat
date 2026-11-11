// Transforma `![alt](imagem.jpg "Legenda")`, sozinha num parágrafo, em <figure> com <figcaption>.
// Assim quem escreve em Markdown consegue legendas sem HTML.
import { visit } from 'unist-util-visit';

export default function remarkFiguras() {
  return (arvore) => {
    visit(arvore, 'paragraph', (no) => {
      const [img] = no.children;
      if (no.children.length !== 1 || img.type !== 'image' || !img.title) return;
      const legenda = img.title;
      img.title = null;
      no.data = { hName: 'figure' };
      no.children = [
        img,
        { type: 'text', value: legenda, data: { hName: 'figcaption', hChildren: [{ type: 'text', value: legenda }] } },
      ];
    });
  };
}
