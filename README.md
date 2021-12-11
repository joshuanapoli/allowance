# bitcoind-lnd

This repo gives a docker-compose file for running three Lightning Network nodes. In my case, the nodes are meant to provide a fun way to give allowance money to my two kids. Compared with cash, well, we just don't usually have any cash around and the kids just lose it. Compared with opening a checking account: our bank doesn't seem to offer accounts for underage people. There are products like [greenlight](https://www.greenlight.com/) meant for allowance management, but they have monthly fees. I don't really want the kids to buy stuff anyway. We can work together to transform sats into stuff.

So this project implements a bitcoin core node, supporting three Lightning Network nodes. I run the whole thing on an old Raspberry Pi 2.

Use rpcauth.py to generate a password and hash. Put the values in .env. Fill in EXTERNALIP if you want other lightning users to create channels with you. Set RPCUSER if you want the bitcoin rpc username to be different from "lnd". Set ALIAS1, ALIAS2 and ALIAS3 to name your node (maximum of 32 characters).
```
ALIAS1=myname
ALIAS2=kid1
ALIAS3=kid2
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

We use Zap to control the nodes. It's a little complicated to setup.

You'll need to initialize each Lightning Network node. First, create wallets. Print out the seed passphrase and store it somewhere safe. You'll need that when your Raspberry Pi burns down. I did not use a passphrase to encrypt the seed passphrase.

```shell
docker exec -it lnd-1 lncli create
docker exec -it lnd-2 lncli create
docker exec -it lnd-3 lncli create
```

For simplicity, I only connected lnd-1 to public channels.

Create an address.

```shell
pi@raspberrypi:~ $ docker exec -it lnd-1 lncli newaddress p2wkh
{
    "address": "..."
}
```

Transfer some btc to the address. I had some on coinbase.

Open a connection to the outside world. lightningconductor is an interesting one; if you open a channel with 500,000 sats, it will reciprocate with an inbound channel of 500,000 sats. This is "inbound liquidity", which is otherwise kind of hard to get. Inbound liquidity is useful for being able to route transactions... However, we probably won't be connecting enough channels to actually be useful for routing any transactions on the Lightning Network.

I connected lnd-2 and lnd-3 to lnd-1. 
```shell
docker exec -it lnd-1 lncli connect 
```

Oops. Three Lightning Nodes is a bit much for a Raspberry Pi 2.
```shell
top - 03:01:59 up 3 days, 12:00,  2 users,  load average: 33.82, 17.68, 8.02
Tasks: 139 total,   1 running, 138 sleeping,   0 stopped,   0 zombie
%Cpu(s): 64.4 us, 14.7 sy,  0.0 ni,  3.8 id,  9.3 wa,  0.0 hi,  7.8 si,  0.0 st
MiB Mem :    922.8 total,     52.2 free,    598.1 used,    272.6 buff/cache
MiB Swap:    100.0 total,      9.5 free,     90.5 used.    271.8 avail Mem
```