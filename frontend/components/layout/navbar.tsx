"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Wallet, Menu, X } from "lucide-react";
import { Button } from "@components/ui/button";
import { truncateAddress } from "@lib/utils";

// ✅ Correctly imported custom hook for wallet connection
import { useWallet } from "@hooks/useWallet";

const Navbar = () => {
  const pathname = usePathname();
  const { connected, publicKey, connectWallet, disconnectWallet } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Trading", path: "/trading" },
    { name: "Docs", path: "https://archangel.gitbook.io/docs" },
  ];

  return (
    <nav className="bg-base-200 border-b border-base-300 shadow-sm sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="ArchAngel Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <Link href="/" className="text-xl font-bold text-primary">
            ArchAngel
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              className={`text-sm font-medium transition-colors ${
                pathname === link.path
                  ? "text-primary"
                  : "text-base-content/70 hover:text-primary"
              }`}
              target={link.path.startsWith("http") ? "_blank" : "_self"}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Wallet + Mobile Menu */}
        <div className="flex items-center gap-3">
          {connected ? (
            <>
              <span className="hidden sm:block text-sm font-mono text-success">
                {truncateAddress(publicKey || "")}
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={disconnectWallet}
                className="flex items-center gap-2"
              >
                <Wallet size={16} />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={connectWallet}
              className="flex items-center gap-2"
            >
              <Wallet size={16} />
              Connect
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-base-content hover:text-primary transition"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-base-300 border-t border-base-200 flex flex-col px-4 py-3 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              className={`text-sm font-medium transition ${
                pathname === link.path
                  ? "text-primary"
                  : "text-base-content/80 hover:text-primary"
              }`}
              target={link.path.startsWith("http") ? "_blank" : "_self"}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
