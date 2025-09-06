import { CONFIG } from 'src/config-global';

import { ProfileView } from 'src/sections/user/view/user-profile';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Profile - ${CONFIG.appName}`}</title>

      <ProfileView />
    </>
  );
}
