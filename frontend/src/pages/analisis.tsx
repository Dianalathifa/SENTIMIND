import { CONFIG } from 'src/config-global';

import {AnalisisView}  from 'src/sections/analisis/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Crawlings - ${CONFIG.appName}`}</title>

      < AnalisisView />
    </>
  );
}
