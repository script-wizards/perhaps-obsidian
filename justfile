install:
    pnpm install

build:
    pnpm build

# copy the built plugin into an Obsidian vault, e.g.
# just vault-install path/to/vault
vault-install vault:
    pnpm build
    mkdir -p "{{vault}}/.obsidian/plugins/perhaps"
    cp main.js manifest.json styles.css "{{vault}}/.obsidian/plugins/perhaps/"
