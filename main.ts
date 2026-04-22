import { App } from "cdktn";

import { CurioSwitchStack } from "./stacks/curioswitch/index.js";
import { SysadminStack } from "./stacks/sysadmin/index.js";

const app = new App();

new SysadminStack(app);

new CurioSwitchStack(app, {
  environment: "dev",
  project: "curioswitch-dev",
  domain: "alpha.curioswitch.org",
});

new CurioSwitchStack(app, {
  environment: "prod",
  project: "curioswitch-prod",
  domain: "curioswitch.org",
});

app.synth();
