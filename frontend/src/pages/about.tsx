import { CONFIG } from 'src/config-global';

import AboutView from 'src/sections/about/about-view';


// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Abouts - ${CONFIG.appName}`}</title>

      <AboutView />
    </>
  );
}
