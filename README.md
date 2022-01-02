# Allowance

My wife and I like to give my kids allowance and rewards for doing certain chores. We rarely use cash, and so we usually don't have cash available to give the kids. We try to remember the IOUs, but the kids don't trust us. The kids are pretty good at confusing us too, so we don't trust them. Our bank does not offer accounts for kids, and most kid-oriented financial products have pretty high monthly fees. [Step](https://step.com/) does offer an excellent no-fee bank account and credit card product for kids, but mine are a little too young for it. [Greenlight](https://www.greenlight.com/) is another interesting product for allowances. It has a chore to-do list, and it gives each child a debit card, unfortunately it also gives the parents a monthly fee. Right now, allowance actually seems like a decent use-case for cryptocurrency in my family.

We will start our cryptocurrency journey at the beginning: with Bitcoin. The kids and their friends have heard of it. I have read the original Bitcoin papers so I have some chance of explaining something about how it works. I hope that these factors will make Bitcoin allowance be more relatable and relevant to our family. 

There are a couple of problems to get started. First, Bitcoin is too slow. Kids are pretty impatient. Waiting 30 minutes for a transaction confirmation just does not make sense. The second problem is that fees are sometimes high. Right now, it costs about 10 cents for a Bitcoin transaction, but the cost is sometimes as high as $20. So the Bitcoin fee is generally too high for sending a dollar at a time. The Bitcoin ecosystem has a solution for these problems: the [Lightning Network](https://lightning.network/).

So begins a new project. The main goal is to create a digital solution for accounting for small amounts of money between parents and kids. Everyone needs to have some ability to spend the money that they have, which rules out simple spreadsheet accounting. Transactions should be pretty quick. In the spirit of trust-minimized systems, the solution should be local. We will avoid using a commercial cloud-hosted service, especially one that would require a monthly fee. If possible, the solution will run on my spare Raspberry Pi 2. We will give the Lightning Network a try, to see if it works for our family allowances.

## The Lightning Network

The Lightning Network is a peer-to-peer payment network that allows participants to send and receive payments. It is a cooperative approach to reducing the cost and latency of Bitcoin transactions. The Lightning Network uses a _flow model_, which contrasts with the _broadcast model_ used in Bitcoin and Ethereum use a _broadcast model_. The network has been around for a few years, and in 2021 it gained in notoriety because of attention by [Jack Dorsey and twitter](https://blog.twitter.com/en_us/topics/product/2021/bringing-tips-to-everyone), and also because of playing a role in El Salvador's Bitcoin experiment.

In Lightning Network, payments flow through a graph of connections. The payment is not handled by the network at large, only the nodes along the path between the two transacting parties. Channels are linked to the Bitcoin blockchain via [contracts](https://developer.bitcoin.org/devguide/contracts.html). Any number of transactions can be sent through the channel, but only two blockchain transactions are needed per channel. One transaction opens the channel, and a second one closes it. The flow model allows transactions to settle much faster with very low fees. On the other hand, it requires nodes to be constantly online in order to transmit payments, guard against malicious channel closes and handle channel open/close message.

The need for each node to be constant online and active makes Lightning Network rather awkward to use. Running a Lightning Network node requires attention to disaster recovery and high availability concerns that are not present in blockchain nodes.  

## Create the Node

### Software Stack

The most widely used server for Lightning Network is [lnd](https://github.com/lightningnetwork/lnd) by [Lightning Labs](https://lightning.engineering/). The lnd service depends on a Bitcoin full node. I used [Bitcoin Core](https://bitcoincore.org/). I also included a web interface [Ride the Lightning](https://github.com/Ride-The-Lightning/RTL), for ease of use. Since this thing is holding money for me, backups are critical. The lnd server has a built-in feature to back-up critical channel data. I used [syncthing](https://syncthing.net/) to replicate channel backup files to other devices.

### Raspberry Pi

[Umbrel](https://getumbrel.com/) is the premier distribution for an at-home node. If you already have a 4 GiB Raspberry Pi 4, or can buy [Umbrel's hardware](https://thebitcoinmachines.com/product/machine-with-umbrel/), then you will definitely have an easier time. This project will use an old Raspberry Pi 2. It only has 1 GiB of RAM and cannot run the Umbrel distribution.

To keep things simple, I use the SD Card for all storage. Most guides recommend a SSD. Running from the SD Card keeps the project simple. When the SD Card quits, it should be easy enough to rebuild the system from this docker-compose configuration and the backups. Note that a [Raspberry Pi 2 can use a maximum 256 GiB SD Card.](https://github.com/raspberrypi/documentation/pull/1136) I chose to use a [SanDisk Extreme Pro](https://www.amazon.com/gp/product/B07G3H5RBT) based on a [Tom's Hardware review](https://www.tomshardware.com/best-picks/raspberry-pi-microsd-cards).

### Initial Block Download

A troublesome aspect of running a Bitcoin full node is the [initial block download](https://bitcoin.org/en/full-node#initial-block-downloadibd). A new node is supposed to download the blockchain from the Bitcoin network and verify all transactions. There are a couple of challenges here. As of 2022, the blockchain is 300 GiB which does not fit in our 256 GiB maximum disk. To reduce disk usage, this project configures Bitcoin core in pruned mode; only the most recent blocks are kept. The second problem is that the Raspberry Pi 2 is just no fast enough to verify all transactions within a reasonable amount of time. My solution was to first synchronize Bitcoin Core on a faster computer (a Mac Mini) and then copy the data to the Raspberry Pi using scp `scp -r lnd pi@raspberrypi:/home/pi/allowance/lnd`.

### Monitoring

Going offline is unhealthy for a Lightning Network node. It obviously eliminates the possibility of routing transactions. Moreover, an unscrupulous (or confused) channel partner could theoretically submit a stale commitment transaction. Typically, a node has 24 hours to post the invalidation transaction (the channel's CSV Delay) to punish a peer that posts a stale commitment. If our node is offline, posting the invalidation transaction is impossible, and therefore we could theoretically lose funds from the channel. This scenario is unlikely, but it does show that we need to have monitoring and alerting in place. (Watchtowers are a new alternative, but watchtowersn are not fully developed yet.)

The [lightning.watch](https://lightning.watch/) is a nice service for monitoring a node. It gives a notification via telegram if the node goes offline. It has a free service level, though it recommends opening a channel which ties up a minimum of 20k sats (about $10, as of January 2022) within Lightning Network.

### Docker

This repo gives a docker-compose file for running a Lightning Network node using the Lightning Labs lnd server and Bitcoin Core. The configuration is meant for Raspberry Pi, but works on other platforms. I use the same docker-compose file on a Mac Mini. To get started, Docker and docker-compose must be installed on the system.

To install Docker on Raspberry Pi OS:

1. Download and run the installer.
   ```shell
   curl -fsSL https://get.docker.com | sh
   ```
2. Allow the default pi user to run docker commands.
   ```shell
   sudo usermod -aG docker pi
   ```
3. Restart the system, so that the user modification takes full effect.

Next, [install docker-compose](https://docs.docker.com/compose/install/). On Raspberry Pi OS, the steps are:

1. Download the docker-compose program.
   ```shell
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-linux-armv7" -o /usr/local/bin/docker-compose
   ```
2. Make it executable.
   ```shell
   sudo chmod +x /usr/local/bin/docker-compose
   ```
3. Check that it works. The following command should show "Docker Compose version v2.2.2".
   ```shell
   docker-compose --version
   ```
4. Configure docker to start when the system boots up.
   ```shell
   sudo systemctl enable docker
   ```

### Configuration

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

# Limitations

The Raspberry Pi 2 only has 1 GiB of memory, which is a pretty severe limitation. I found that it was impossible to run bitcoind plus two lnd instances because the lnd instances keep crashing. So my son runs his LN node on his own Mac Mini.

Thunderhub is a web interface similar to Ride the Lightning. Its server required more memory than RTL, and could not run alongside the bitcoin and lnd servers.

[Zap](https://www.zaphq.io/) is a nice user-friendly interface for Lightning Network nodes, created by [Jack Mallers](https://twitter.com/JackMallers). The [Zap iOS](https://github.com/LN-Zap/zap-iOS#unmaintained) app works for me, if I set my lnd node to auto-unlock. Unfortunately, the author warns that the iOS app now unmaintained. The [Zap Deskop app](https://github.com/LN-Zap/zap-desktop) is also nice, but it has some bugs that prevents it from starting up if the node is already unlocked. The author moved on to found [Strike](https://strike.me/en/), which famously works with Twitter to enable Bitcoin tips via Lightning Network. It is a really nice product, but it is not relevant to a self-run Lightning Network node. [Strike terms of service require users to be at least 18 years old.](https://strike.me/en/legal/tos)

I tried the [Joule](https://lightningjoule.com/) browser extension, but [there is a problem with getting it to work with lnd v0.14.1](https://github.com/joule-labs/joule-extension/issues/291). The author kindly fixed the problem, but I haven't had a chance to try it out again.

# Liquidity Market

[Lightning Labs](https://https://lightning.engineering/) has some pretty esoteric products for trading and mananging liquidity in the Lightning Network. The need to "manage" liquidity is an odd "bug" with Lightning Network. If I already have a credit on a network, I would expect to be able to spend it on the network. With LN, that's not necessarily the case, and there can be some overhead in rebalancing your liquidity. It seems to me that such balancing should be built into the lnd nodes, but it is not.

Overall, Lightning Network is an oddball in the crypto world. It is designed to make transactions work with lower cost and higher speed, while maintaining most of the key cryptocurrency features to which it is tied. It is pretty successful at this. On the other hand, LN is not very good for gambling. It does not create a new token. Its focus on minimizing transaction fees means that there is not much possibility for growth of funds. It is a cooperative for practically improving the utilitarian properties of the system.

# Why Crypto?

Bitcoin is a _permissionless_ blockchain. Everyone is welcome to participate in the network. Our children are minors. They are excluded from most traditional financial products, but they are free to participate in Bitcoin.


"The Lightning Network allows for transactions to be secured by the Bitcoin network without being directly broadcast to it. Since users of a Lightning channel co-sign every change in balance of the channel, either user can choose to broadcast a settlement transaction at any time. As long as both parties are constantly monitoring the channel state (via their node or wallet service), this makes Lightning highly trust-minimised since neither of the channel’s users need to trust each other in order to transact." https://blog.liquid.net/six-differences-between-liquid-and-lightning/
