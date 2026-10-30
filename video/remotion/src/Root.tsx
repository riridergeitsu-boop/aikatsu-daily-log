import {Composition} from 'remotion';
import '@fontsource/mochiy-pop-one';
import {Shoplist, TOTAL_SEC} from './Shoplist';

export const FPS = 30;

export const Root: React.FC = () => (
  <Composition id="Shoplist" component={Shoplist} durationInFrames={Math.round(TOTAL_SEC * FPS)} fps={FPS} width={1080} height={1920} />
);
