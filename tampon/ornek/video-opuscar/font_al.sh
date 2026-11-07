#!/bin/sh
# Demoların yazı tiplerini Google Fonts (OFL, ücretsiz) deposundan beklenen adlarla indirir
B=https://raw.githubusercontent.com/google/fonts/main/ofl
al(){ mkdir -p "$(dirname "$2")"; curl -fsSL -o "$2" "$B/$1" && echo "ok $2" || echo "YOK $2"; }
W=styles/woodcut/demo/fonts; S=styles/silent-film/demo/fonts; G=styles/engraving/demo/fonts
al imfellenglish/IMFeENrm28P.ttf $W/IMFellEnglish.ttf; al imfellenglish/IMFeENit28P.ttf $W/IMFellEnglish-Italic.ttf; al imfellenglishsc/IMFeENsc28P.ttf $W/IMFellEnglishSC.ttf
al oldstandardtt/OldStandard-Regular.ttf $S/OldStandard-Regular.ttf; al oldstandardtt/OldStandard-Bold.ttf $S/OldStandard-Bold.ttf; al oldstandardtt/OldStandard-Italic.ttf $S/OldStandard-Italic.ttf
al "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" "$S/PlayfairDisplay[wght].ttf"; al "playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf" "$S/PlayfairDisplay-Italic[wght].ttf"
al playfairdisplaysc/PlayfairDisplaySC-Black.ttf $S/PlayfairDisplaySC-Black.ttf; al playfairdisplaysc/PlayfairDisplaySC-Bold.ttf $S/PlayfairDisplaySC-Bold.ttf
al "bodonimoda/BodoniModa%5Bopsz,wght%5D.ttf" $G/BodoniModa-VF.ttf; al "bodonimoda/BodoniModa-Italic%5Bopsz,wght%5D.ttf" $G/BodoniModa-Italic-VF.ttf; al pinyonscript/PinyonScript-Regular.ttf $G/PinyonScript-Regular.ttf
