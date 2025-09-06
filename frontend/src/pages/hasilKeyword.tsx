import { CONFIG } from 'src/config-global';

import { KeywordOverviewView } from 'src/sections/hasil/KeywordOverviewView';


// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Hasil - ${CONFIG.appName}`}</title>

      < KeywordOverviewView />
    </>
  );
}
