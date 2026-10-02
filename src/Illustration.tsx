import type { Picture } from '../shared/content.ts';

export function Drink({ kind, className = '' }: { kind: Picture; className?: string }) {
  return <svg className={className} viewBox="0 0 160 160" aria-hidden="true">
    <ellipse cx="80" cy="132" rx="50" ry="8" fill="#365c4c" opacity=".1" />
    {kind === 'water' && <>
      <path d="M48 35h65l-8 86c-1 11-48 11-49 0z" fill="#fdfdf8" stroke="#789c9d" strokeWidth="3" />
      <path d="M53 72q15-8 30 0t25 0l-5 47q-23 11-44 0z" fill="#acd6df" />
      <path d="M61 49l4 58" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="80" cy="35" rx="32" ry="8" fill="#e3f0f2" stroke="#789c9d" strokeWidth="3" />
    </>}
    {kind === 'milk' && <>
      <path d="M52 47l16-22h34l13 22v82H52z" fill="#fffdf8" stroke="#849b86" strokeWidth="3" />
      <path d="M52 47h63v26H52z" fill="#a2b7a1" /><path d="M69 25v22M52 47h63" stroke="#849b86" strokeWidth="3" />
      <path d="M73 93q8-18 15 0t-7 21q-19-2-8-21" fill="#a2b7a1" />
    </>}
    {kind === 'tea' && <>
      <path d="M108 66h14q26 28-8 37" fill="none" stroke="#aa967d" strokeWidth="9" />
      <path d="M44 64h69v36q-4 29-35 29T44 100z" fill="#dcc9ad" stroke="#aa967d" strokeWidth="3" />
      <ellipse cx="79" cy="64" rx="34" ry="8" fill="#967958" />
      <path d="M68 45q-10-9 0-19M86 43q-10-9 0-19" fill="none" stroke="#aa967d" strokeWidth="3" strokeLinecap="round" />
    </>}
  </svg>;
}

export function Scene({ child = false }: { child?: boolean }) {
  return <svg viewBox="0 0 400 290" className="scene" aria-label={child ? 'A teddy bear and a glass of water at snack time' : 'A glass of water on a sunny café table'} role="img">
    <rect x="220" y="20" width="140" height="165" rx="65" fill="#f8f6e6" opacity=".7" />
    <path d="M289 20v165M220 100h140" stroke="#d7dfca" strokeWidth="5" />
    <path d="M0 215h400v75H0z" fill="#e2d9bd" /><path d="M0 214h400" stroke="#c9bc97" strokeWidth="3" />
    <ellipse cx="188" cy="249" rx="110" ry="14" fill="#c7b990" opacity=".45" />
    <path d="M133 112h95l-12 110q-2 19-70 0z" fill="#fffdf3" stroke="#73918d" strokeWidth="3" />
    <path d="M140 159q23-10 44 0t38 0l-8 61q-31 14-66 0z" fill="#a6ccd0" />
    <path d="M154 132l6 62" stroke="white" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="181" cy="112" rx="47" ry="11" fill="#dce9e6" stroke="#73918d" strokeWidth="3" />
    {child ? <>
      <circle cx="70" cy="146" r="22" fill="#ba9270" /><circle cx="115" cy="146" r="22" fill="#ba9270" />
      <circle cx="92" cy="174" r="38" fill="#c9a17e" /><ellipse cx="92" cy="189" rx="19" ry="15" fill="#ead4b5" />
      <circle cx="79" cy="174" r="3" fill="#594736" /><circle cx="106" cy="174" r="3" fill="#594736" />
      <ellipse cx="92" cy="186" rx="5" ry="4" fill="#594736" />
    </> : <>
      <path d="M305 214v-72" stroke="#728762" strokeWidth="4" />
      <ellipse cx="290" cy="157" rx="17" ry="9" transform="rotate(35 290 157)" fill="#849871" />
      <ellipse cx="321" cy="144" rx="19" ry="10" transform="rotate(-35 321 144)" fill="#98a781" />
      <path d="M278 180h55l-8 35h-39z" fill="#bd947c" />
    </>}
    <path d="M54 73v15M47 81h15M352 197v13M345 203h14" stroke="#96a77e" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
