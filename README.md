# bitcoind-lnd

This repo gives a docker-compose file for running three Lightning Network nodes. In my case, the nodes are meant to provide a fun way to give allowance money to my two kids. Compared with cash, well, we just don't usually have any cash around and the kids just lose it. Compared with opening a checking account: our bank doesn't seem to offer accounts for underage people. There are products like [greenlight](https://www.greenlight.com/) meant for allowance management, but they have monthly fees.

So this project implements a bitcoin core node, supporting three Lightning Network nodes. I run the whole thing on an old Raspberry Pi 2.

Use rpcauth.py to generate a password and hash. Put the values in .env. Fill in EXTERNALIP if you want other lightning users to create channels with you. Set RPCUSER if you want the bitcoin rpc username to be different from "lnd". Set ALIAS-1, ALIAS-2 and ALIAS-3 to name your node (maximum of 32 characters).
```
ALIAS-1=myname
ALIAS-2=kid1
ALIAS-3=kid2
RPCUSER=lnd
RPCAUTH=lnd:123$567890abcdef
RPCPASS=secret
EXTERNALIP=1.2.3.4
PRUNE=550
TLSEXTRADOMAIN=home-sweet-home.dynalias.com
```

Check that the certificate has your TLSEXTRADOMAIN in it. `openssl x509 -text -noout -in lnd/tls.cert`
Rebuild the certificate if you change TLSEXTRADOMAIN. `sudo rm lnd/tls.cert lnd/tls.key`. `docker-compose restart`.
https://docs.zaphq.io/docs-desktop-lnd-configure



Build a lndconnect uri for zap. See https://github.com/LN-Zap/lndconnect/blob/master/lnd_connect_uri.md
```shell
sudo apt-get install -y qrencode
source .env
echo lndconnect://${TLSEXTRADOMAIN}:10009?cert="`grep -v 'CERTIFICATE' lnd/tls.cert | tr -d '=' | tr '/+' '_-'`"'&macaroon='"`sudo base64 lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '=' | tr '/+' '_-'`" | tr -d '\n' | qrencode -o /tmp/out.png
```

```shell
scp pi@raspberrypi:/tmp/out.png .
open out.png
```