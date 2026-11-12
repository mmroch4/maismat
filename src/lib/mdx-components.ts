// Components available in every article without an `import`: just write <Challenge ...> in the text.
import Challenge from '../components/Challenge.astro';
import Collatz from '../components/Collatz.astro';
import Demo from '../components/Demo.astro';
import GeoGebra from '../components/GeoGebra.astro';
import MontyHall from '../components/MontyHall.astro';
import PascalTriangle from '../components/PascalTriangle.astro';
import Skyscrapers from '../components/Skyscrapers.astro';

export const mdxComponents = { Challenge, Collatz, Demo, GeoGebra, MontyHall, PascalTriangle, Skyscrapers };
