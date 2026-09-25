import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { DocumentProcessor } from './documentProcessor.ts';
import { CONFIG } from './config.ts';
import { type PretrainedOptions } from "@huggingface/transformers";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { displayResults } from "./util.ts";

let _neo4jVectorStore = null;

async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string) {
    console.log(`🚀 Limpando todos os nós do Neo4j com o label: ${nodeLabel}...\n`);

    await vectorStore.query(
        "MATCH (n:Chunk) DETACH DELETE n"
    );
    console.log(`✅ Todos os nós do Neo4j com o label: ${nodeLabel} foram removidos com sucesso!\n`);

}

try {
    console.log("🚀 Inicializando sistema de Embeddings com Neo4j...\n");

    const documentPrecessor = new DocumentProcessor(
        CONFIG.pdf.path,
        CONFIG.textSplitter
    );

    const documents = await documentPrecessor.loadAndSplit();
    //console.log(documents);
    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: CONFIG.embedding.modelName,
        pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions
    });

    //  const response = await embeddings.embedQuery(
    //    "JavaScript"
    //)

    //const response = await embeddings.embedDocuments(
    //  ["Javascript"]
    //)

    //  console.log('response', response)

     _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
        embeddings,
        CONFIG.neo4j
    );

    await clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel);
    console.log(Object.entries(documents))

    for (const [index, doc] of documents.entries()) {
        console.log(`✅ Adicionando documento ${index + 1}/${documents.length}`);
        await _neo4jVectorStore.addDocuments([doc])
    }

    console.log("\n✅ Base de dados populada com sucesso!\n");
    //===========================================================================
    console.log("ETAPA 02 Buscando a Similaridade\n");

    const questions = [
        "O que são tensores e como são representados em JavaScript?",
        "Como converter objetos JavaScript em tensores?",
        "O que é normalização de dados e por que é necessária?",
        "Como funciona uma rede neural no TensorFlow.js?",
        "O que significa treinar uma rede neural?",
        "O que é hot encoding e quando usar?"
    ]

    for (const question of questions) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📌 PERGUNTA: ${question}`);
        console.log('='.repeat(80));

        const results = await _neo4jVectorStore.similaritySearch(
            question,
            CONFIG.similarity.topK
        );
        displayResults(results);
        //  console.log(results);
    }


    // Cleanup
    console.log(`\n${'='.repeat(80)}`);
    console.log("✅ Processamento concluído com sucesso!\n");



} catch (error) {
    console.error('Error occurred:', error);
} finally {
        await _neo4jVectorStore?.close();
}