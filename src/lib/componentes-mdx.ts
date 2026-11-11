// Componentes disponíveis em todos os artigos sem `import`: basta escrever <Desafio ...> no texto.
import ArranhaCeus from '../components/ArranhaCeus.astro';
import Collatz from '../components/Collatz.astro';
import Desafio from '../components/Desafio.astro';
import MontyHall from '../components/MontyHall.astro';
import TrianguloPascal from '../components/TrianguloPascal.astro';

export const componentesMdx = { ArranhaCeus, Collatz, Desafio, MontyHall, TrianguloPascal };
