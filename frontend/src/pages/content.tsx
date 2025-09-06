import { _posts } from 'src/_mock';
import { CONFIG } from 'src/config-global';

import { ContentView } from 'src/sections/content/view/content-user';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Content - ${CONFIG.appName}`}</title>

      <ContentView  />
    </>
  );
}
