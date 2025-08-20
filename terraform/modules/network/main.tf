# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public Subnet 1
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-1"
  }
}

# Public Subnet 2 (for ALB requirement)
resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.5.0/24"
  availability_zone       = var.availability_zone_2
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-2"
  }
}

# Private Subnet 1 - Web Tier
resource "aws_subnet" "private_web" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = var.availability_zone

  tags = {
    Name = "${var.project_name}-private-web-subnet"
  }
}

# Private Subnet 2 - App Tier
resource "aws_subnet" "private_app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = var.availability_zone

  tags = {
    Name = "${var.project_name}-private-app-subnet"
  }
}

# Private Subnet 3 - DB Tier (Primary)
resource "aws_subnet" "private_db" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = var.availability_zone

  tags = {
    Name = "${var.project_name}-private-db-subnet-1"
  }
}

# Private Subnet 4 - DB Tier (Secondary for DB Subnet Group requirement)
resource "aws_subnet" "private_db_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.6.0/24"
  availability_zone = var.availability_zone_2

  tags = {
    Name = "${var.project_name}-private-db-subnet-2"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  depends_on = [aws_internet_gateway.main]

  tags = {
    Name = "${var.project_name}-nat-gateway"
  }
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# Private Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_web" {
  subnet_id      = aws_subnet.private_web.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_app" {
  subnet_id      = aws_subnet.private_app.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_db" {
  subnet_id      = aws_subnet.private_db.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_db_2" {
  subnet_id      = aws_subnet.private_db_2.id
  route_table_id = aws_route_table.private.id
}

# DB Subnet Group (RDS用) - 複数AZで構成してSingle-AZ RDSを配置
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_db.id, aws_subnet.private_db_2.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}