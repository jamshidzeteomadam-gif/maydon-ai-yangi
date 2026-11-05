"""Qwen3-0.6B LoRA training: run only with a CUDA GPU and compatible Python 3.10/3.11."""
import argparse, json
from pathlib import Path
import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTConfig, SFTTrainer

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output", default="training/out/qwen3-uz-lora")
    ap.add_argument("--epochs",type=float,default=2.0)
    args=ap.parse_args()
    if not torch.cuda.is_available():
        raise SystemExit("GPU yo'q. Colab Runtime > Change runtime type > GPU.")
    path=Path("training/data/uzbek_chat.jsonl")
    data=[{"messages":json.loads(x)["messages"]} for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert len(data)>=40
    tokenizer=AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B")
    bf16=torch.cuda.is_bf16_supported()
    model=AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-0.6B",torch_dtype=torch.bfloat16 if bf16 else torch.float16)
    model.config.use_cache=False
    conf=SFTConfig(output_dir=args.output,max_length=384,num_train_epochs=args.epochs,
        per_device_train_batch_size=1,gradient_accumulation_steps=8,learning_rate=2e-4,
        logging_steps=5,save_strategy="epoch",save_total_limit=2,report_to="none",
        assistant_only_loss=True,gradient_checkpointing=True,bf16=bf16,fp16=not bf16)
    adapter=LoraConfig(r=8,lora_alpha=16,lora_dropout=0.05,bias="none",
        task_type="CAUSAL_LM",target_modules=["q_proj","v_proj"])
    trainer=SFTTrainer(model=model,args=conf,train_dataset=Dataset.from_list(data),
        processing_class=tokenizer,peft_config=adapter)
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    Path(args.output,"TRAINED_OK.txt").write_text("Training finished; evaluate before deployment.\n")
    print("SAVED",args.output)

if __name__=="__main__":main()
