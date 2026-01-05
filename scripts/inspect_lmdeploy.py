
import lmdeploy
import os
import pkgutil

package = lmdeploy
print(f"lmdeploy path: {package.__path__}")

print("\nSubmodules in lmdeploy:")
for importer, modname, ispkg in pkgutil.iter_modules(package.__path__):
    print(f"  {modname} (is_pkg={ispkg})")

try:
    import lmdeploy.serve
    print("\nSubmodules in lmdeploy.serve:")
    for importer, modname, ispkg in pkgutil.iter_modules(lmdeploy.serve.__path__):
        print(f"  {modname} (is_pkg={ispkg})")
except ImportError:
    print("\nlmdeploy.serve not found")

