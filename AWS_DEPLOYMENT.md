# AWS Deployment with CloudFormation

This guide shows you how to deploy the Tournament Control System to AWS using CloudFormation for automated setup.

## Deployment Options

We provide two CloudFormation templates:

1. **Lightsail** (`cloudformation-lightsail.yaml`) - Simplest, fixed pricing
2. **EC2** (`cloudformation-ec2.yaml`) - More control, free tier eligible

Choose based on your needs:
- **New to AWS or want simplicity?** → Use Lightsail
- **Want free tier or already using EC2?** → Use EC2

---

# Option 1: AWS Lightsail Deployment

Lightsail is AWS's simplified compute service with predictable pricing.

## Cost
- **$3.50/month** (nano instance) - Recommended for most tournaments
- **$5/month** (micro instance) - For larger tournaments with more concurrent users

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured (optional but recommended)
3. **Your code pushed to GitHub** (public or private repo you have access to)

## Deployment Options

### Option A: AWS Console (Easiest)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Open AWS CloudFormation Console**
   - Go to: https://console.aws.amazon.com/cloudformation
   - Click "Create stack" → "With new resources"

3. **Upload Template**
   - Choose "Upload a template file"
   - Select `cloudformation-lightsail.yaml`
   - Click "Next"

4. **Configure Parameters**
   - **Stack name**: `tournament-control-stack`
   - **InstanceName**: `tournament-control` (or your preferred name)
   - **BundleId**: `nano_3_0` (for $3.50/month) or `micro_3_0` (for $5/month)
   - **GitRepoUrl**: Your GitHub repo URL (e.g., `https://github.com/yourusername/tournament-control.git`)
   - **StaffPassword**: Change from default!
   - **JudgesPassword**: Change from default!
   - Click "Next"

5. **Configure Stack Options**
   - Leave defaults
   - Click "Next"

6. **Review and Create**
   - Review your settings
   - Check "I acknowledge that AWS CloudFormation might create IAM resources"
   - Click "Submit"

7. **Wait for Completion**
   - Stack creation takes 5-10 minutes
   - Status will change to `CREATE_COMPLETE`

8. **Get Your IP Address**
   - Go to: https://lightsail.aws.amazon.com/
   - Click on your instance name
   - Note the public IP address
   - Access your app at: `http://YOUR_IP_ADDRESS`

9. **Create Static IP (Recommended)**
   - In Lightsail console, go to Networking tab
   - Click "Create static IP"
   - Select your instance
   - Give it a name and click "Create"
   - This ensures your IP doesn't change if you restart the instance

### Option B: AWS CLI (Faster)

```bash
# Deploy the stack
aws cloudformation create-stack \
  --stack-name tournament-control-stack \
  --template-body file://cloudformation-lightsail.yaml \
  --parameters \
    ParameterKey=InstanceName,ParameterValue=tournament-control \
    ParameterKey=BundleId,ParameterValue=nano_3_0 \
    ParameterKey=GitRepoUrl,ParameterValue=https://github.com/YOUR_USERNAME/YOUR_REPO.git \
    ParameterKey=StaffPassword,ParameterValue=YOUR_STAFF_PASSWORD \
    ParameterKey=JudgesPassword,ParameterValue=YOUR_JUDGES_PASSWORD

# Check status
aws cloudformation describe-stacks \
  --stack-name tournament-control-stack \
  --query 'Stacks[0].StackStatus'

# Get outputs (once complete)
aws cloudformation describe-stacks \
  --stack-name tournament-control-stack \
  --query 'Stacks[0].Outputs'
```

## What Gets Created

The CloudFormation template automatically:

1. ✅ Creates a Lightsail instance (Ubuntu 22.04)
2. ✅ Installs Node.js 18.x
3. ✅ Clones your GitHub repository
4. ✅ Installs all dependencies
5. ✅ Builds the frontend
6. ✅ Configures environment variables
7. ✅ Starts the app with PM2 (auto-restart on crash)
8. ✅ Sets up PM2 to start on server reboot
9. ✅ Installs and configures Nginx as reverse proxy
10. ✅ Creates and attaches a static IP address
11. ✅ Configures WebSocket support

## After Deployment

### Access Your Application

1. Go to Lightsail console: https://lightsail.aws.amazon.com/
2. Click on your instance name
3. Copy the public IP address
4. Access your tournament system at: `http://YOUR_IP_ADDRESS`

**Recommended**: Create a static IP in Lightsail console (Networking tab) so your IP doesn't change.

### SSH into Your Instance

```bash
# Get the IP from CloudFormation outputs, then:
ssh ubuntu@YOUR_STATIC_IP

# Check application logs
pm2 logs tournament-control

# Check application status
pm2 status

# Restart application
pm2 restart tournament-control
```

### Update Your Application

```bash
# SSH into the instance
ssh ubuntu@YOUR_STATIC_IP

# Navigate to app directory
cd /opt/tournament-control

# Pull latest changes
git pull

# Rebuild
npm run build

# Restart
pm2 restart tournament-control
```

## Lightsail Bundle Sizes

| Bundle ID | RAM | vCPUs | Storage | Transfer | Price/Month |
|-----------|-----|-------|---------|----------|-------------|
| nano_3_0  | 512 MB | 2 | 20 GB | 1 TB | $3.50 |
| micro_3_0 | 1 GB | 2 | 40 GB | 2 TB | $5.00 |
| small_3_0 | 2 GB | 2 | 60 GB | 3 TB | $10.00 |

**Recommendation**: Start with `nano_3_0`. It's sufficient for most tournaments. Upgrade if needed.

## Adding HTTPS (Optional but Recommended)

### Using Let's Encrypt (Free SSL)

```bash
# SSH into your instance
ssh ubuntu@YOUR_STATIC_IP

# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Certbot will automatically configure nginx for HTTPS
# Certificates auto-renew
```

**Note**: You need a domain name pointing to your static IP for HTTPS.

## Troubleshooting

### Check if app is running
```bash
ssh ubuntu@YOUR_STATIC_IP
pm2 status
pm2 logs tournament-control
```

### Check nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Restart everything
```bash
pm2 restart tournament-control
sudo systemctl restart nginx
```

### View deployment logs
```bash
# Check cloud-init logs (initial setup)
sudo cat /var/log/cloud-init-output.log
```

### Application won't start
- Check if Git repo URL is correct and accessible
- Verify the repo is public or you've set up SSH keys
- Check PM2 logs: `pm2 logs tournament-control`

## Manual Deployment (If Git URL Not Provided)

If you didn't provide a Git URL, you'll need to upload your code manually:

```bash
# On your local machine, create a tarball
tar -czf tournament-control.tar.gz \
  --exclude=node_modules \
  --exclude=client/node_modules \
  --exclude=.git \
  .

# Copy to server
scp tournament-control.tar.gz ubuntu@YOUR_STATIC_IP:/tmp/

# SSH into server
ssh ubuntu@YOUR_STATIC_IP

# Extract and setup
cd /opt/tournament-control
tar -xzf /tmp/tournament-control.tar.gz
npm run install-all
npm run build
pm2 restart tournament-control
```

## Updating the Stack

To change parameters (like passwords or instance size):

```bash
aws cloudformation update-stack \
  --stack-name tournament-control-stack \
  --template-body file://cloudformation-lightsail.yaml \
  --parameters \
    ParameterKey=InstanceName,UsePreviousValue=true \
    ParameterKey=BundleId,ParameterValue=micro_3_0 \
    ParameterKey=GitRepoUrl,UsePreviousValue=true \
    ParameterKey=StaffPassword,ParameterValue=NEW_PASSWORD \
    ParameterKey=JudgesPassword,UsePreviousValue=true
```

## Deleting the Stack

To remove everything and stop charges:

```bash
# Via CLI
aws cloudformation delete-stack --stack-name tournament-control-stack

# Or via Console
# Go to CloudFormation → Select stack → Delete
```

**Warning**: This will delete your instance and all data. Backup your database first!

## Backup Your Database

```bash
# Download database from server
scp ubuntu@YOUR_STATIC_IP:/opt/tournament-control/server/tournament.db ./tournament-backup.db

# Restore database to server
scp ./tournament-backup.db ubuntu@YOUR_STATIC_IP:/opt/tournament-control/server/tournament.db
pm2 restart tournament-control
```

## Cost Optimization Tips

1. **Use nano instance** ($3.50/month) unless you need more resources
2. **Delete the stack** when not in use (tournaments are seasonal)
3. **Backup your database** before deleting
4. **Redeploy when needed** - takes only 10 minutes with CloudFormation

## Support

- **Lightsail Console**: https://lightsail.aws.amazon.com/
- **CloudFormation Console**: https://console.aws.amazon.com/cloudformation
- **AWS Lightsail Docs**: https://docs.aws.amazon.com/lightsail/

## Security Best Practices

1. ✅ Change default passwords in CloudFormation parameters
2. ✅ Use HTTPS with Let's Encrypt (see above)
3. ✅ Keep system updated: `sudo apt-get update && sudo apt-get upgrade`
4. ✅ Regularly backup your database
5. ✅ Consider restricting SSH access to your IP in Lightsail firewall


---

# Option 2: AWS EC2 Deployment (t4g.nano)

EC2 provides more control and is eligible for AWS Free Tier (12 months free for new accounts).

## Cost
- **Free for 12 months** (750 hours/month of t2.micro or t3.micro)
- **After free tier**: ~$3-4/month (t4g.nano ARM-based)
- **Alternative**: ~$6-7/month (t4g.micro for more resources)

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **EC2 Key Pair** - Create one in EC2 console if you don't have one
3. **AWS CLI** installed and configured (optional but recommended)
4. **Your code pushed to GitHub**

## Key Differences from Lightsail

| Feature | Lightsail | EC2 |
|---------|-----------|-----|
| Pricing | Fixed ($3.50/month) | Variable (~$3-4/month) |
| Free Tier | No | Yes (12 months) |
| Setup Complexity | Simpler | More options |
| Networking | Automatic | VPC, subnets, etc. |
| SSH Access | Password or key | Key pair required |
| Best For | Simplicity | Cost optimization, existing AWS users |

## Deployment Steps

### Step 1: Create EC2 Key Pair (if needed)

```bash
# Via AWS CLI
aws ec2 create-key-pair \
  --key-name tournament-control-key \
  --query 'KeyMaterial' \
  --output text > tournament-control-key.pem

chmod 400 tournament-control-key.pem

# Or via Console: EC2 → Key Pairs → Create Key Pair
```

### Step 2: Deploy via AWS Console

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Open AWS CloudFormation Console**
   - Go to: https://console.aws.amazon.com/cloudformation
   - Click "Create stack" → "With new resources"

3. **Upload Template**
   - Choose "Upload a template file"
   - Select `cloudformation-ec2.yaml`
   - Click "Next"

4. **Configure Parameters**
   - **Stack name**: `tournament-control-ec2-stack`
   - **InstanceName**: `tournament-control`
   - **InstanceType**: `t4g.nano` (ARM-based, cheapest) or `t3.nano` (x86)
   - **GitRepoUrl**: Your GitHub repo URL
   - **StaffPassword**: Change from default!
   - **JudgesPassword**: Change from default!
   - **KeyPairName**: Select your EC2 key pair
   - **AllowedSSHCIDR**: `0.0.0.0/0` (or restrict to your IP for security)
   - Click "Next"

5. **Configure Stack Options**
   - Leave defaults
   - Click "Next"

6. **Review and Create**
   - Review your settings
   - Check "I acknowledge that AWS CloudFormation might create IAM resources"
   - Click "Submit"

7. **Wait for Completion**
   - Stack creation takes 5-10 minutes
   - Status will change to `CREATE_COMPLETE`
   - Go to "Outputs" tab to see your application URL and IP address

### Step 3: Deploy via AWS CLI

```bash
# Deploy the stack
aws cloudformation create-stack \
  --stack-name tournament-control-ec2-stack \
  --template-body file://cloudformation-ec2.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=InstanceName,ParameterValue=tournament-control \
    ParameterKey=InstanceType,ParameterValue=t4g.nano \
    ParameterKey=GitRepoUrl,ParameterValue=https://github.com/YOUR_USERNAME/YOUR_REPO.git \
    ParameterKey=StaffPassword,ParameterValue=YOUR_STAFF_PASSWORD \
    ParameterKey=JudgesPassword,ParameterValue=YOUR_JUDGES_PASSWORD \
    ParameterKey=KeyPairName,ParameterValue=tournament-control-key \
    ParameterKey=AllowedSSHCIDR,ParameterValue=0.0.0.0/0

# Check status
aws cloudformation describe-stacks \
  --stack-name tournament-control-ec2-stack \
  --query 'Stacks[0].StackStatus'

# Get outputs (once complete)
aws cloudformation describe-stacks \
  --stack-name tournament-control-ec2-stack \
  --query 'Stacks[0].Outputs'
```

## What Gets Created (EC2 Template)

The CloudFormation template automatically creates:

1. ✅ VPC with public subnet
2. ✅ Internet Gateway and route table
3. ✅ Security Group (ports 22, 80, 443)
4. ✅ EC2 t4g.nano instance (ARM-based Ubuntu 22.04)
5. ✅ Elastic IP address (static IP)
6. ✅ IAM role for CloudWatch (optional monitoring)
7. ✅ Installs Node.js, PM2, Nginx
8. ✅ Clones your repo and builds the app
9. ✅ Configures auto-restart on reboot
10. ✅ Sets up automatic security updates

## EC2 Instance Types

| Type | Architecture | RAM | vCPUs | Price/Month | Free Tier |
|------|-------------|-----|-------|-------------|-----------|
| t4g.nano | ARM64 | 512 MB | 2 | ~$3 | No |
| t4g.micro | ARM64 | 1 GB | 2 | ~$6 | No |
| t3.nano | x86_64 | 512 MB | 2 | ~$4 | No |
| t3.micro | x86_64 | 1 GB | 2 | ~$7 | Yes (750 hrs/mo) |
| t2.micro | x86_64 | 1 GB | 1 | ~$8 | Yes (750 hrs/mo) |

**Recommendation**: 
- **New AWS accounts**: Use `t3.micro` or `t2.micro` for free tier
- **After free tier**: Use `t4g.nano` (ARM-based, cheapest)

## After EC2 Deployment

### Access Your Application

1. Go to CloudFormation Outputs tab
2. Copy the `PublicIP` or click `ApplicationUrl`
3. Access your tournament system!

### SSH into Your Instance

```bash
# Use the key pair you specified
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Check application logs
pm2 logs tournament-control

# Check application status
pm2 status

# Restart application
pm2 restart tournament-control
```

### Update Your Application

```bash
# SSH into the instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Navigate to app directory
cd /opt/tournament-control

# Pull latest changes
git pull

# Rebuild
npm run build

# Restart
pm2 restart tournament-control
```

## EC2-Specific Management

### View Deployment Logs

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP
sudo cat /var/log/user-data.log
```

### Stop/Start Instance (to save costs)

```bash
# Stop instance (stops charges, keeps data)
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Note: Elastic IP remains associated and doesn't change
```

### Restrict SSH Access

For better security, restrict SSH to your IP:

```bash
# Get your current IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Update stack with restricted SSH
aws cloudformation update-stack \
  --stack-name tournament-control-ec2-stack \
  --use-previous-template \
  --parameters \
    ParameterKey=InstanceName,UsePreviousValue=true \
    ParameterKey=InstanceType,UsePreviousValue=true \
    ParameterKey=GitRepoUrl,UsePreviousValue=true \
    ParameterKey=StaffPassword,UsePreviousValue=true \
    ParameterKey=JudgesPassword,UsePreviousValue=true \
    ParameterKey=KeyPairName,UsePreviousValue=true \
    ParameterKey=AllowedSSHCIDR,ParameterValue=${MY_IP}/32 \
  --capabilities CAPABILITY_IAM
```

## Monitoring and Costs

### Check Your AWS Bill

```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Set Up Billing Alerts

1. Go to AWS Billing Console
2. Create a budget alert (e.g., alert if costs exceed $10/month)

## Troubleshooting EC2

### Instance won't start
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids YOUR_INSTANCE_ID

# View system logs
aws ec2 get-console-output --instance-id YOUR_INSTANCE_ID
```

### Can't SSH
- Verify security group allows your IP on port 22
- Check key pair permissions: `chmod 400 your-key.pem`
- Verify you're using correct username: `ubuntu`

### Application not accessible
```bash
# Check if nginx is running
ssh -i your-key.pem ubuntu@YOUR_IP
sudo systemctl status nginx

# Check if app is running
pm2 status

# Check security group allows port 80
aws ec2 describe-security-groups --group-ids YOUR_SG_ID
```

## Deleting EC2 Stack

To remove everything and stop charges:

```bash
# Via CLI
aws cloudformation delete-stack --stack-name tournament-control-ec2-stack

# Or via Console
# Go to CloudFormation → Select stack → Delete
```

**Warning**: This deletes everything including your database. Backup first!

## Comparison: Which Should You Choose?

| Consideration | Choose Lightsail | Choose EC2 |
|--------------|------------------|------------|
| New to AWS | ✅ Yes | ❌ No |
| Want simplicity | ✅ Yes | ❌ No |
| Have free tier available | ❌ No | ✅ Yes |
| Want lowest cost after free tier | ✅ Yes (slightly) | ✅ Yes (similar) |
| Need VPC integration | ❌ No | ✅ Yes |
| Want more control | ❌ No | ✅ Yes |
| Already using EC2 | ❌ No | ✅ Yes |

**Bottom line**: 
- **First time?** → Lightsail
- **Have AWS free tier?** → EC2 t3.micro
- **After free tier expires?** → Either works, both ~$3-5/month
