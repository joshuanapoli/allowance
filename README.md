# Allowance

My wife and I like to give my kids allowance and rewards for doing certain chores. But we rarely use cash, and so we usually don't have cash available to give the kids. We try to remember the IOUs, but the kids don't trust us. The kids are pretty good at confusing us too, so we don't trust them. Our bank does not offer accounts for kids, and most kid-oriented financial products have pretty high monthly fees. [Step](https://step.com/) does offer an excellent no-fee bank account and credit card product for kids, but mine are a little too young for it. Right now, allowance actually seems like a decent use-case for cryptocurrency in my family.

We will start our cryptocurrency journey at the beginning: with Bitcoin. The kids and their friends have heard of it. I have read the original Bitcoin papers so I have some chance of explaining something about how it works. I hope that these factors will make Bitcoin allowance be more relatable and relevant to our family. Newer technologies like Solana have other ways of dealing with scaling network capacity, but they are less known and also seem to be less mature and reliable than Bitcoin.

The first problem is that Bitcoin fees are sometimes high. The Bitcoin ecosystem kind of has a solution for this: the [Lightning Network](https://lightning.network/). The network has been around for a few years. It provides low-cost Bitcoin transactions across channels. Channels provide secure transactions between pairs of users, and they connect together transitively to provide transactions between any members of the network. Adoption has been slow because the Lightning Network is awkward to use. A Bitcoin wallet is just data. If you keep your private key safe and secure, then your balance is still good and available even if you don't think about it for years. On the other hand, each channel on the Lightning Network requires a server to be constantly online. Maybe watchtowers will lift this responsibility from the shoulders of individual users, but it remains to be seen whether these are a scalable and properly incentivised solution. If a server is offline for too long, then the balances on the channel are vulnerable. Despite this problem, Jack Dorsey and El Salvador have been interested in the Lightning Network lately. [Twitter can now send Bitcoin tips to authors via the Lightning Network.](https://blog.twitter.com/en_us/topics/product/2021/bringing-tips-to-everyone) So we will also give the Lightning Network another try, to see if it works for our family allowances.

We need a Bitcoin full node, in order to run a Lightning Network channel. To test things out, I am using an old Raspberry Pi 2. I think that running on Raspberry Pi is more in-character for blockchain nodes than relying on a cloud provider. I will run a full Bitcoin node. This means that I need at least 300 GB to store the blockchain. Unfortunately, Raspberry Pi 2 has a bug that limits the maximum SD card size to 256 MB. So I need an external hard drive to store the blockchain. Luckily, I have an old unused 5 TB drive layout around, which I reformatted for this project.

## The Lightning Network

The Lightning Network node is a peer-to-peer payment network that allows you to send and receive payments. The Lightning Network uses a _flow model_ where Bitcoin uses a _broadcase model_. In Lightning Network, payments flow through a graph of connections. The payment is not handled by the network at large, only the nodes along the path between the two transacting parties. Channels are linked to the Bitcoin blockchain via special contracts. To open a channel, one party locks up a quantity of Bitcoin. This amount is now available for spending and can flow through the network. Bitcoin is released to an ordinary address when the channel is closed. Normally closing the channel happens cooperatively by the two parties. Channels can also be force-closed by one party, using a sweep. The flow model allows transactions to settle much faster and generally allows lower fees. On the other hand, it requires nodes to be constantly online in order to transmit payments, guard against malicious channel closes and handle channel open/close message.

## Online/Offiline

This project seeks to build an always-online node that does not necessarily require a Watchtower. The Lightning Network now has the concept of Watchtowers, meant to allow nodes to safely go offline. I don't think that there is a great ready-made option for using an offline node. Mobile apps that support this mode are very "beta", and also appear to be relatively expensive. For example [breeze](https://breez.technology/) iOS app is still only available via testflight, and it charges a 1% fee when opening new channels. Since I could not find a very "free" ready-made option for using LN with an offline node, I decided to stick with an online node.

Now, online nodes could be built using a cloud-hosted server. The fact that I would get a bill for running the cloud server is a bit discouraging. My traditional bank account is free, so paying to run a cloud server seems like a regression. Luckily, I found a Raspberry Pi lying around, leftover from some old abandoned project.

## Docker

This repo gives a docker-compose file for running a Lightning Network node using the Lightning Labs lnd server and Bitcoin Core. The configuration is meant for Raspberry Pi 2 or 3. The docker-compose file will work on Raspberry Pi 4 and larger 64-bit computers, but you will probably be happier using the Umbrel distribution rather than this project. Umbrel includes similar base servers, but supports a large ecosystem of plugins. Unfortunately for me, Umbrel requires at least a Raspberry Pi 4, while I only have a Raspberry Pi 2.

In my case, the nodes are meant to provide a fun way to give allowance money to my kid. Compared with cash, well, we just don't usually have any cash around and the kids just lose it. Compared with opening a checking account: our bank doesn't seem to offer accounts for underage people. There are products like [greenlight](https://www.greenlight.com/) meant for allowance management, but they have monthly fees. I don't really want the kids to buy stuff anyway. We can work together to transform sats into stuff.

So this project implements a bitcoin core node, supporting three Lightning Network nodes. I run the whole thing on an old Raspberry Pi 2.

Use rpcauth.py to generate a password and hash. Put the values in .env. Fill in EXTERNALIP if you want other lightning users to create channels with you. Set RPCUSER if you want the bitcoin rpc username to be different from "lnd". Set ALIAS1, ALIAS2 and ALIAS3 to name your node (maximum of 32 characters).
```
ALIAS=myname
RPCUSER=lnd
RPCAUTH=lnd:123$567890abcdef
RPCPASS=secret
EXTERNALIP=1.2.3.4:9735
PRUNE=550
HOST=home-sweet-home.dynalias.com
WALLET_UNLOCK_PASSWORD_FILE=/user/pi/allowance/password
```

Check that the certificate has your HOST in it. `openssl x509 -text -noout -in lnd/tls.cert`
Rebuild the certificate if you change HOST. `sudo rm lnd/tls.cert lnd/tls.key`. `docker-compose restart`.
https://docs.zaphq.io/docs-desktop-lnd-configure



Build a lndconnect uri for zap. See https://github.com/LN-Zap/lndconnect/blob/master/lnd_connect_uri.md
```shell
sudo apt-get install -y qrencode
source .env
echo lndconnect://${HOST}:10009?cert="`grep -v 'CERTIFICATE' lnd/tls.cert | tr -d '=' | tr '/+' '_-'`"'&macaroon='"`sudo base64 lnd/data/chain/bitcoin/mainnet/admin.macaroon | tr -d '=' | tr '/+' '_-'`" | tr -d '\n' | qrencode -o /tmp/out.png
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

# MacOS

[Download and install Docker.](docs.docker.com/desktop/mac/install/)

Open the dmg disk image and drag the Docker app to the dock.

Run the Docker app, for example open spotlight and search for Docker.

Accept the terms and install.

Docker Desktop includes docker-compose.

# Hardware

In my case, the Raspberry Pi 2 was leftover from an earlier project since it was free to use. The good advice is to use an external SSD for Raspberry Pi Bitcoin and Lightning Network projects, because SSDs are faster and designed for better durability than SD Cards. I chose to ignore this good advice. In either case, we need to back-up the Lightning Network node data to an external drive. I think that it will be easy enough to rebuild on a new SD Card when the first one dies. I used a 128 GB SanDisk Extreme Pro, based on [Toms Hardware's review](https://www.tomshardware.com/best-picks/raspberry-pi-microsd-cards). A Raspberry Pi 2 can use up to a 256 GB SD Card, but the larger size was unavailable at the time I ordered. The [128 GB Micro SD Card](https://www.amazon.com/gp/product/B07G3H5RBT/ref=ppx_od_dt_b_asin_title_s00?ie=UTF8&th=1) cost me $23.10. 

A Raspberry Pi 2 has 1 GiB RAM, which is apparently sufficient to run bitcoin-core and a single lnd instance. I wanted to run multiple lnd nodes, but I found that it is impossible to run bitcoin-cord plus two lnd instances. The servers keep crashing, presumably because of insufficient memory.

# Networking

The bitcoin-core node should have port 8333 open to the internet. This allows the node to participate in the Bitcoin peer-to-peer network. Once the daemon is started, you can check your network configuration using [bitnodes](https://bitnodes.io/#join-the-network). The web site will check whether it can connect to your node. After a while, you should also attract incoming connections. These will be listed by bitcoin-cli getnetworkinfo as connection_in.

It only makes sense to have one bitcoin-core node on the local network. Therefore, this configuration exposes the bitcoin-core ZMQ and RPC ports, so that I can use it with multiple lnd nodes. Do not expose the ZMQ and RPC ports to the internet. If you use the wallet on the bitcoin-core node, then the RPC interface would give access to it.


The RPC interface is password-protected, but it can give access to the node's wallet. I don't use the node wallet, so it's not a concern for me.

# LND Setup

### Create a Ligntning Network Node

Start with a .env configuration like this:
```
ALIAS=myname
RPCUSER=lnd
RPCAUTH=lnd:123$567890abcdef
RPCPASS=secret
EXTERNALIP=1.2.3.4:9735
PRUNE=550
HOST=home-sweet-home.dynalias.com
```
Later, we will add a unlocking password file.

How do we get the RPCAUTH and RPCPASS values? We should include a script to generate them here.

docker exec -it lnd lncli create

Answer "n" to "Do you have an existing cipher [...]". Do not use a passphrase.

### Automatic Unlock

It seems annoying to "manually" unlock the wallet every time we want to use it. It is unpredictable when it becomes locked; for example after a reboot. You can automatically unlock with:

1. Create a /home/pi/allowance/lnd/password.txt file with the password in it.
2. Restrict its permissionss.
   ```shell
   chmod 0400 /home/pi/allowance/lnd/password.txt
   ```
3. Add `WALLET_UNLOCK_PASSWORD_FILE=/root/.lnd/password.txt` to the .env file.

### Integrate with UI

echo lndconnect:...

you don't need to automatic unlock if you use the zap desktop app.

### Integrate with LDN

open port 9735 to the internet

### Create a channel for allowance

docker exec -it lnd lncli getinfo

Get your identity_pubkey.

#### Connect 

On Pi, docker exec -it lnd lncli connect <identity_pubkey>@joshuanapoli.dynalias.com:9736

#### Create a channel

docker exec -it lnd lncli openchannel <identity_pubkey> --local_amt 10000