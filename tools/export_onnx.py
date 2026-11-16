#!/usr/bin/env python3
"""
export_onnx.py: Export AnimeGANv2 PyTorch weights to ONNX for ONNX Runtime Web.

Usage:
  python tools/export_onnx.py --style hayao --size 256 --output web/public/models/animegan2_hayao.onnx
  python tools/export_onnx.py --download-all
"""

import os
import sys
import argparse
import urllib.request

try:
    import torch
    import torch.nn as nn
except ImportError:
    print("PyTorch is required for exporting ONNX models. Run: pip install torch torchvision")
    sys.exit(1)


# Official AnimeGANv2 Generator Architecture (PyTorch implementation)
class ConvBlock(nn.Module):
    def __init__(self, in_c, out_c, kernel_size=3, stride=1, padding=1, bias=False):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, kernel_size, stride, padding, bias=bias)
        self.ins = nn.InstanceNorm2d(out_c)
        self.act = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        return self.act(self.ins(self.conv(x)))


class InvertedResidualBlock(nn.Module):
    def __init__(self, in_c, out_c, stride=1, expand_ratio=2):
        super().__init__()
        self.stride = stride
        hidden_dim = int(round(in_c * expand_ratio))
        self.use_res_connect = self.stride == 1 and in_c == out_c

        layers = []
        if expand_ratio != 1:
            layers.append(ConvBlock(in_c, hidden_dim, kernel_size=1, stride=1, padding=0))
        layers.extend([
            nn.Conv2d(hidden_dim, hidden_dim, 3, stride, 1, groups=hidden_dim, bias=False),
            nn.InstanceNorm2d(hidden_dim),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Conv2d(hidden_dim, out_c, 1, 1, 0, bias=False),
            nn.InstanceNorm2d(out_c),
        ])
        self.conv = nn.Sequential(*layers)

    def forward(self, x):
        if self.use_res_connect:
            return x + self.conv(x)
        else:
            return self.conv(x)


class AnimeGANv2Generator(nn.Module):
    def __init__(self):
        super().__init__()
        self.block_a = nn.Sequential(
            ConvBlock(3, 32, 7, 1, 3),
            ConvBlock(32, 64, 3, 2, 1),
            ConvBlock(64, 64, 3, 1, 1)
        )
        self.block_b = nn.Sequential(
            ConvBlock(64, 128, 3, 2, 1),
            ConvBlock(128, 128, 3, 1, 1)
        )
        self.block_c = nn.Sequential(
            InvertedResidualBlock(128, 128),
            InvertedResidualBlock(128, 128),
            InvertedResidualBlock(128, 128),
            InvertedResidualBlock(128, 128),
        )
        self.block_d = nn.Sequential(
            nn.ConvTranspose2d(128, 64, 3, 2, 1, 1, bias=False),
            nn.InstanceNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True),
            ConvBlock(64, 64, 3, 1, 1)
        )
        self.block_e = nn.Sequential(
            nn.ConvTranspose2d(64, 32, 3, 2, 1, 1, bias=False),
            nn.InstanceNorm2d(32),
            nn.LeakyReLU(0.2, inplace=True),
            ConvBlock(32, 32, 3, 1, 1),
            nn.Conv2d(32, 3, 7, 1, 3),
            nn.Tanh()
        )

    def forward(self, x):
        x = self.block_a(x)
        x = self.block_b(x)
        x = self.block_c(x)
        x = self.block_d(x)
        x = self.block_e(x)
        return x


CHECKPOINT_URLS = {
    'hayao': 'https://github.com/bryandlee/animegan2-pytorch/raw/main/weights/hayao.pt',
    'paprika': 'https://github.com/bryandlee/animegan2-pytorch/raw/main/weights/paprika.pt',
    'facepaint': 'https://github.com/bryandlee/animegan2-pytorch/raw/main/weights/face_paint_512_v2.pt',
}


def download_file(url: str, dest_path: str):
    print(f"Downloading {url} -> {dest_path}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    urllib.request.urlretrieve(url, dest_path)
    print("Download complete.")


def export_to_onnx(weights_path: str, output_path: str, size: int = 256):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    device = torch.device('cpu')

    model = AnimeGANv2Generator().to(device)
    print(f"Loading weights from {weights_path}...")
    state_dict = torch.load(weights_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()

    dummy_input = torch.randn(1, 3, size, size, device=device)

    print(f"Exporting ONNX model to {output_path} (input size: 1x3x{size}x{size})...")
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes=None  # Fixed axes yield faster WebGPU execution
    )
    print(f"ONNX export successful: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Export AnimeGANv2 PyTorch weights to ONNX")
    parser.add_argument('--style', choices=['hayao', 'paprika', 'facepaint'], default='hayao')
    parser.add_argument('--size', type=int, default=256, help="Input dimension (256 or 512)")
    parser.add_argument('--output', type=str, default=None)
    parser.add_argument('--download-all', action='store_true', help="Download and export all checkpoints")

    args = parser.parse_args()

    models_dir = os.path.join(os.path.dirname(__file__), '..', 'web', 'public', 'models')
    weights_dir = os.path.join(os.path.dirname(__file__), 'weights')
    os.makedirs(weights_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    if args.download_all:
        for style, url in CHECKPOINT_URLS.items():
            pt_path = os.path.join(weights_dir, f"{style}.pt")
            if not os.path.exists(pt_path):
                download_file(url, pt_path)
            onnx_path = os.path.join(models_dir, f"animegan2_{style}.onnx")
            export_to_onnx(pt_path, onnx_path, size=args.size)
        return

    output = args.output or os.path.join(models_dir, f"animegan2_{args.style}.onnx")
    pt_path = os.path.join(weights_dir, f"{args.style}.pt")

    if not os.path.exists(pt_path):
        url = CHECKPOINT_URLS[args.style]
        download_file(url, pt_path)

    export_to_onnx(pt_path, output, size=args.size)


if __name__ == '__main__':
    main()
