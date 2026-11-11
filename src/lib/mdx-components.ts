// Components available in every article without an `import`: just write <Desafio ...> in the text.
import ArranhaCeus from '../components/ArranhaCeus.astro';
import Collatz from '../components/Collatz.astro';
import Demonstracao from '../components/Demonstracao.astro';
import Desafio from '../components/Desafio.astro';
import GeoGebra from '../components/GeoGebra.astro';
import MontyHall from '../components/MontyHall.astro';
import TrianguloPascal from '../components/TrianguloPascal.astro';

export const mdxComponents = { ArranhaCeus, Collatz, Demonstracao, Desafio, GeoGebra, MontyHall, TrianguloPascal };
