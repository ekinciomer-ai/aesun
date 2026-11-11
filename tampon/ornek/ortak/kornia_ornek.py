import os, torch, kornia as K, kornia.augmentation as A, cv2, numpy as np
G, C = os.environ["GIRDI"], os.environ["CIKTI"]
x = K.image_to_tensor(cv2.cvtColor(cv2.resize(cv2.imread(f"{G}/astronot.jpg"), (320, 320)), cv2.COLOR_BGR2RGB)).float()[None] / 255
torch.manual_seed(3)
aug = A.AugmentationSequential(A.ColorJitter(0.3, 0.3, 0.3, 0.1, p=1), A.RandomAffine(20, scale=(0.8, 1.2), p=1), A.RandomPerspective(0.4, p=1))
ys = [x] + [aug(x) for _ in range(5)]
ys.append(K.filters.canny(x)[1].repeat(1, 3, 1, 1)); ys.append(K.enhance.equalize_clahe(x))
grid = torch.cat([torch.cat(ys[:4], 3), torch.cat(ys[4:], 3)], 2)[0]
cv2.imwrite(f"{C}/kornia_8.jpg", cv2.cvtColor((grid.permute(1, 2, 0).clamp(0, 1).numpy() * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
print("tamam")
