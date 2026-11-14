import React from 'react';
import {Composition} from 'remotion';
import {Antik} from './Antik';
export const Kok: React.FC = () => (
  <Composition id="Antik" component={Antik} durationInFrames={270} fps={30} width={1080} height={1920} />
);
