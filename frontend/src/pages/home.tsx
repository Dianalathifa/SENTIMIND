import { CONFIG } from 'src/config-global';

import HomeView from 'src/sections/home/view/home-view';


// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Homes - ${CONFIG.appName}`}</title>

      <HomeView />
    </>
  );
}
