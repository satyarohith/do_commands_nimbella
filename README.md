# DigitOcean Commands Nimbella

A set of DigitalOcean commands that can be used with Nimbella Commander.

## Install

First, make sure you've [Nimbella Commander](https://nimbella.com/resources-commander/overview) installed in your slack workspace. Then run:
```
/nc csm_install github:satyarohith/do_commands_nimbella
```

After installation, you need to create a secret key called `digitaloceanApiKey` using Nimbella Commander.
```
/nc secret_create
```

Open **'Secret Creator'** and add a key with name `digitaloceanApiKey` and your DigitalOcean API key as its value. Click **'Make Secrets'** and follow the instructions provided in the **'Results'** tab.

# Usage

You can run this command using your current nimbella app. Run `/nc app_current` to know your current app.

For example, my current app is `/devops`. So I can use it to run `dobill` command.
```
/devops dobill
```