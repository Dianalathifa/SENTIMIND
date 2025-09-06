import { CONFIG } from 'src/config-global';

import {HasilView}  from 'src/sections/hasil/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Hasil - ${CONFIG.appName}`}</title>

      < HasilView />
    </>
  );
}
